from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
from app.utils.notificaciones import enviar_correo_rechazo 
from enum import Enum 
import shutil
import os

router = APIRouter()

# Carpeta donde se guardan los documentos
CARPETA_UPLOADS = "uploads"
if not os.path.exists(CARPETA_UPLOADS):
    os.makedirs(CARPETA_UPLOADS)


# Catalogos y esquema de datos
class OpcionesEstadoDocumento(str, Enum):
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"

class SolicitudCrear(BaseModel):
    numero_cuenta: str
    tipo_tramite: str 
    observacion: str | None = None 
    correo_electronico: str 

class ActualizarEstadoDocumento(BaseModel):
    id_admin: int 
    estado: OpcionesEstadoDocumento
    comentario: str | None = None

class RechazarSolicitud(BaseModel): 
    id_admin: int
    motivo: str


# - - - - - - - - - - - - 
# ENDPOINTS ALUMNO
# - - - - - - - - - - - - 

# Endpoint - Crear nueva solicitud
@router.post("/solicitudes/", tags=["Alumno"], summary="Crear una nueva solicitud de trámite")
def crear_solicitud(solicitud: SolicitudCrear):
    tramite = solicitud.tipo_tramite.lower()
    if tramite not in ["locker", "estacionamiento"]:
        raise HTTPException(status_code=400, detail="Trámite inválido. Usa 'locker' o 'estacionamiento'.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # Buscar el ID del alumno
        cursor.execute("SELECT id_alumno FROM alumno WHERE numero_cuenta = %s", (solicitud.numero_cuenta,))
        alumno_bd = cursor.fetchone()
        
        if not alumno_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="El número de cuenta no existe en el sistema.")
            
        id_alumno_real = alumno_bd[0]

        # Actualizar el correo electrónico del alumno
        cursor.execute(
            "UPDATE alumno SET correo_electronico = %s WHERE id_alumno = %s", 
            (solicitud.correo_electronico, id_alumno_real)
        )

        # Validar si ya cuenta con una solicitud activa
        cursor.execute(
            """
            SELECT id_solicitud FROM solicitud 
            WHERE id_alumno = %s AND tipo_tramite = %s AND estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA')
            """,
            (id_alumno_real, tramite)
        )
        solicitud_existente = cursor.fetchone()

        if solicitud_existente:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"Ya tienes una solicitud de {tramite} en proceso.")

        # Insertar nueva solicitud principal
        cursor.execute(
            """
            INSERT INTO solicitud (id_alumno, tipo_tramite, estado, observacion_alumno) 
            VALUES (%s, %s, 'PENDIENTE', %s) RETURNING id_solicitud
            """,
            (id_alumno_real, tramite, solicitud.observacion)
        )
        nueva_solicitud = cursor.fetchone()
        id_generado = nueva_solicitud[0]

        # notifica al personal sobre el nuevo tramite realizado
        cursor.execute("""
            INSERT INTO notificaciones (rol_destino, titulo, mensaje)
            VALUES ('REVISOR', 'Nueva Solicitud Recibida', %s)
        """, (f"El alumno con cuenta {solicitud.numero_cuenta} ha iniciado un trámite de {tramite}.",))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": f"Solicitud de {tramite} creada con éxito.",
            "id_solicitud": id_generado,
            "observacion_registrada": solicitud.observacion,
            "correo_actualizado": solicitud.correo_electronico
        }

    except HTTPException:
        raise 
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# Endpoint - Subida de documentos por tramite
@router.post("/solicitudes/{id_solicitud}/documentos/", tags=["Alumno"], summary="Subir un documento a la solicitud")
async def subir_documento(
    id_solicitud: int, 
    id_tipo_documento: int = Form(...), 
    archivo: UploadFile = File(...)
):
    extensiones_permitidas = ["pdf", "jpg", "jpeg", "png"]
    extension = archivo.filename.split(".")[-1].lower()
    
    if extension not in extensiones_permitidas:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo PDF, JPG o PNG.")

    contenido = await archivo.read()
    if len(contenido) > 5242880:
        raise HTTPException(status_code=400, detail="El archivo es demasiado pesado. Máximo 5MB.")
    
    await archivo.seek(0)

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error en la base de datos")

    try:
        cursor = conexion.cursor()
        
        # Consultar el nombre del tipo de documento usando el ID
        cursor.execute("SELECT nombre_tipo_documento FROM tipo_documento WHERE id_tipo_documento = %s", (id_tipo_documento,))
        tipo_doc_bd = cursor.fetchone()
        
        if not tipo_doc_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Tipo de documento no encontrado en el catálogo.")
            
        # Se guarda el nombre original legible para mostrarlo en el mensaje 
        nombre_documento_legible = tipo_doc_bd[0]
        
        # Se limpia el nombre para guardarlo físicamente sin espacios
        nombre_tipo_limpio = nombre_documento_legible.replace(" ", "_")
        
        # Nombre dinamico
        nombre_seguro = f"{nombre_tipo_limpio}_solicitud_{id_solicitud}_{archivo.filename}"
        ruta_guardado = os.path.join(CARPETA_UPLOADS, nombre_seguro)

        # Se guarda físicamente el archivo con el nuevo nombre
        with open(ruta_guardado, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)

        # INSERTAR O ACTUALIZAR (Lógica para que el alumno pueda corregir archivos rechazados)
        query_doc = """
            INSERT INTO documentos_solicitud (id_solicitud, id_tipo_documento, archivo_path, estado, comentario) 
            VALUES (%s, %s, %s, 'PENDIENTE', NULL)
            ON CONFLICT (id_solicitud, id_tipo_documento) 
            DO UPDATE SET 
                archivo_path = EXCLUDED.archivo_path,
                estado = 'PENDIENTE',
                comentario = NULL,
                fecha_subida = CURRENT_TIMESTAMP
        """
        cursor.execute(query_doc, (id_solicitud, id_tipo_documento, nombre_seguro))
        
        # Si la solicitud completa estaba "Rechazada", al subir nuevos archivos la regresamos a PENDIENTE
        cursor.execute("""
            UPDATE solicitud
            SET estado = 'PENDIENTE'
            WHERE id_solicitud = %s AND estado = 'DOCUMENTACION_INCORRECTA'
        """, (id_solicitud,))
        
        # Notificacion para avisar al personal que corrigio o subio documentos
        cursor.execute("""
            SELECT a.numero_cuenta, s.tipo_tramite FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno WHERE s.id_solicitud = %s
        """, (id_solicitud,))
        info_solicitud = cursor.fetchone()
        
        if info_solicitud:
            cursor.execute("""
                INSERT INTO notificaciones (rol_destino, titulo, mensaje)
                VALUES ('REVISOR', 'Documento Actualizado', %s)
            """, (f"La solicitud ID {id_solicitud} ({info_solicitud[1]}) de la cuenta {info_solicitud[0]} recibió un nuevo archivo: {nombre_documento_legible}.",))
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {
            "mensaje": f"El documento '{nombre_documento_legible}' se ha subido exitosamente.", 
            "archivo": nombre_seguro
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error al guardar en BD: {str(e)}")
    

# Endpoint - Consultar historial de solicitudes por numero de cuenta
@router.get("/solicitudes/{numero_cuenta}", tags=["Alumno"], summary="Consultar historial de solicitudes por alumno")
def consultar_solicitudes_por_alumno(numero_cuenta: str):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        cursor.execute("SELECT id_alumno FROM alumno WHERE numero_cuenta = %s", (numero_cuenta,))
        alumno = cursor.fetchone()

        if not alumno:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Alumno no encontrado")

        id_alumno = alumno[0]

        cursor.execute(
            """
            SELECT
                s.id_solicitud,
                s.tipo_tramite,
                s.estado AS estado_solicitud,
                s.observacion_alumno,
                ds.id_tipo_documento,
                ds.archivo_path,
                ds.comentario,
                ds.estado AS estado_documento,
                ds.id_documento
            FROM solicitud s
            LEFT JOIN documentos_solicitud ds ON s.id_solicitud = ds.id_solicitud
            WHERE s.id_alumno = %s
            ORDER BY s.id_solicitud, ds.id_tipo_documento
            """,
            (id_alumno,)
        )

        filas = cursor.fetchall()
        
        # Diccionario para agrupar las solicitudes y sus documentos anidados
        solicitudes_dict = {}

        for fila in filas:
            id_sol = fila[0]
            
            # Si la solicitud no existe en el diccionario, la creamos
            if id_sol not in solicitudes_dict:
                solicitudes_dict[id_sol] = {
                    "id_solicitud": fila[0],
                    "tipo_tramite": fila[1],
                    "estado_solicitud": fila[2],
                    "observacion_alumno": fila[3],
                    "documentos_tramite": []
                }
            
            # Si hay un documento asociado (como es LEFT JOIN, validamos que no sea NULL)
            if fila[8] is not None:
                solicitudes_dict[id_sol]["documentos_tramite"].append({
                    "id_tipo_documento": fila[4],
                    "archivo": fila[5],
                    "comentario_admin": fila[6],
                    "estado_documento": fila[7],
                    "id_documento": fila[8]
                })

        # Convertimos los valores del diccionario de regreso a una lista para el JSON final
        solicitudes = list(solicitudes_dict.values())

        cursor.close()
        conexion.close()

        return {
            "numero_cuenta": numero_cuenta,
            "solicitudes": solicitudes
        }

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# - - - - - - - - - - - - 
# ENDPOINTS ADMINISTRADOR
# - - - - - - - - - - - - 

# Endpoint - Visualiazr todas las solicitudes creadas por todos los alumnos
@router.get("/solicitudes/", tags=["Administrador / Personal"], summary="Obtener todas las solicitudes de los alumnos (Tabla principal)")
def obtener_todas_las_solicitudes(
    tipo_tramite: str | None = None, 
    estado: str | None = None, 
    fecha: str | None = None
):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        # Construcción dinámica de la consulta con filtros
        query = """
            SELECT 
                s.id_solicitud,
                a.numero_cuenta,
                a.nombre,
                a.apellidos,
                s.tipo_tramite,
                s.fecha_solicitud,
                s.estado
            FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE 1=1
        """
        parametros = []

        if tipo_tramite:
            query += " AND s.tipo_tramite = %s"
            parametros.append(tipo_tramite.lower())
            
        if estado:
            query += " AND s.estado = %s"
            parametros.append(estado.upper())
            
        if fecha:
            # formato YYYY-MM-DD parte que se espera del frontend
            query += " AND DATE(s.fecha_solicitud) = %s"
            parametros.append(fecha)

        query += " ORDER BY s.fecha_solicitud DESC"

        cursor.execute(query, tuple(parametros))
        
        filas = cursor.fetchall()
        solicitudes = []

        for fila in filas:
            solicitudes.append({
                "id_solicitud": fila[0],
                "folio": f"FOL-{fila[0]:04d}", 
                "numero_cuenta": fila[1],
                "nombre_completo": f"{fila[2]} {fila[3]}",
                "tipo_tramite": fila[4],
                "fecha_solicitud": fila[5],
                "estado": fila[6]
            })

        cursor.close()
        conexion.close()
        return {"solicitudes": solicitudes}

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# Endpoint - Aceptar o Rechazar documento individualmente depende de lo que el personal reivse
@router.put("/solicitudes/{id_solicitud}/documentos/{id_documento}", tags=["Administrador / Personal"], summary="Evaluar documento individual")
def evaluar_documento_individual(
    id_solicitud: int,
    id_documento: int,
    datos: ActualizarEstadoDocumento
):
    estado_texto = datos.estado.value 
    comentario_final = datos.comentario

    if estado_texto == "RECHAZADO":
        if not comentario_final or comentario_final.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Debe proporcionar un comentario explicando por qué se rechaza el documento."
            )
    elif estado_texto == "APROBADO":
        comentario_final = None

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # Validar existencia de la relación del documento
        cursor.execute("""
            SELECT id_documento FROM documentos_solicitud
            WHERE id_solicitud = %s AND id_documento = %s
        """, (id_solicitud, id_documento))

        if not cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Documento no encontrado o no pertenece a la solicitud.")

        # Actualizar estado del documento específico
        cursor.execute("""
            UPDATE documentos_solicitud
            SET estado = %s, comentario = %s
            WHERE id_solicitud = %s AND id_documento = %s
        """, (estado_texto, comentario_final, id_solicitud, id_documento))

        # Registrar huella básica de quién se encuentra auditando el trámite
        cursor.execute("""
            UPDATE solicitud
            SET revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s AND estado = 'PENDIENTE'
        """, (datos.id_admin, id_solicitud))

        # (SE ELIMINÓ LA NOTIFICACIÓN INDIVIDUAL COMO FUE SOLICITADO)

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Documento evaluado correctamente.",
            "id_solicitud": id_solicitud,
            "id_documento": id_documento,
            "nuevo_estado": estado_texto,
            "comentario_registrado": comentario_final
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# Endpoint - Rechazar la solicitud completa del tramite y notificar via correo electronico al alumno
@router.post("/solicitudes/{id_solicitud}/rechazar", tags=["Administrador / Personal"], summary="Rechazar solicitud completa y notificar via correo electronico")
def rechazar_solicitud(id_solicitud: int, datos: RechazarSolicitud):
    if not datos.motivo or datos.motivo.strip() == "":
        raise HTTPException(status_code=400, detail="El motivo de rechazo es obligatorio.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # Extraer los datos necesarios (incluyendo numero_cuenta para la notificacion)
        cursor.execute("""
            SELECT s.estado, s.tipo_tramite, a.nombre, a.apellidos, a.correo_electronico, a.numero_cuenta
            FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE s.id_solicitud = %s
        """, (id_solicitud,))
        solicitud_actual = cursor.fetchone()

        if not solicitud_actual:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        estado_anterior = solicitud_actual[0]

        
        if estado_anterior == "DOCUMENTACION_INCORRECTA":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud ya ha sido rechazada anteriormente. No se pueden enviar más notificaciones.")
            
        if estado_anterior == "APROBADA":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud ya está aprobada, no se puede rechazar.")

        tramite = solicitud_actual[1]
        nombre_completo = f"{solicitud_actual[2]} {solicitud_actual[3]}" 
        correo_alumno = solicitud_actual[4] 
        num_cuenta_alumno = solicitud_actual[5]
        nuevo_estado = "DOCUMENTACION_INCORRECTA"

        # Actualizar tabla principal solicitud
        cursor.execute("""
            UPDATE solicitud
            SET estado = %s, revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s
        """, (nuevo_estado, datos.id_admin, id_solicitud))

        # Se registra cualquier cambio en el historial_resultados
        cursor.execute("""
            INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario)
            VALUES (%s, %s, %s, %s, %s)
        """, (id_solicitud, estado_anterior, nuevo_estado, datos.id_admin, datos.motivo))
        
        # Notificacion se le notifica al alumno en el sistema
        cursor.execute("""
            INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje)
            VALUES (%s, 'ALUMNO', 'Trámite Rechazado', %s)
        """, (num_cuenta_alumno, f"Tu solicitud de {tramite} fue rechazada. Revisa tu correo o el sistema para corregir."))

        conexion.commit()

        
        # Se le notifica al alumno por correo electronico el motivo de rechazo
        correo_enviado = enviar_correo_rechazo(correo_alumno, nombre_completo, tramite, datos.motivo)

        cursor.close()
        conexion.close()

        mensaje_respuesta = "Solicitud rechazada y auditoría registrada exitosamente."
        if not correo_enviado:
            mensaje_respuesta += " (Advertencia: Guardado en BD, pero falló el envío de correo)."

        return {
            "mensaje": mensaje_respuesta,
            "id_solicitud": id_solicitud,
            "estado": nuevo_estado,
            "auditoria": "Guardada en historial_estados",
            "correo_notificado": correo_alumno
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# - - - - - - - - - - - - 
# ENDPOINTS NOTIFICACIONES
# - - - - - - - - - - - - 

# Endpoint - Se manda notificaciones en el sistema por cuenta o por cada rol
@router.get("/notificaciones/{numero_cuenta}", tags=["Notificaciones"], summary="Obtener notificaciones por cuenta o rol")
def obtener_notificaciones(numero_cuenta: str, rol: str = "ALUMNO"):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        # Trae las individuales del usuario y las del rol asignado para el personal
        cursor.execute("""
            SELECT id_notificacion, titulo, mensaje, leida, fecha_creacion
            FROM notificaciones
            WHERE numero_cuenta = %s OR rol_destino = %s
            ORDER BY fecha_creacion DESC
        """, (numero_cuenta, rol.upper()))
        
        filas = cursor.fetchall()
        notificaciones = []

        for fila in filas:
            notificaciones.append({
                "id_notificacion": fila[0],
                "titulo": fila[1],
                "mensaje": fila[2],
                "leida": fila[3],
                "fecha": fila[4]
            })

        cursor.close()
        conexion.close()
        return {"notificaciones": notificaciones}

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# Enpoint - Lectura de notificacion marcada como leida
@router.put("/notificaciones/{id_notificacion}/leer", tags=["Notificaciones"], summary="Marcar notificación como leída")
def marcar_notificacion_leida(id_notificacion: int):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            UPDATE notificaciones SET leida = TRUE WHERE id_notificacion = %s
        """, (id_notificacion,))
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": "Notificación marcada como leída"}

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")   