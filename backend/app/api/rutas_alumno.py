from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
import shutil
import os
from typing import Optional
from app.utils.seguridad import obtener_hash_contrasena, verificar_contrasena

router = APIRouter()

# Carpeta donde se guardan los documentos
CARPETA_UPLOADS = "uploads"
if not os.path.exists(CARPETA_UPLOADS):
    os.makedirs(CARPETA_UPLOADS)

class SolicitudCrear(BaseModel):
    numero_cuenta: str
    tipo_tramite: str 
    correo_electronico: str
    placas: Optional[str] = None
    modelo: Optional[str] = None
    color: Optional[str] = None





@router.post("/solicitudes/", tags=["Alumno"], summary="Crear una nueva solicitud de tramite (Se guarda como borrador la solicitud)")
def crear_solicitud(solicitud: SolicitudCrear):
    tramite = solicitud.tipo_tramite.lower()
    if tramite not in ["locker", "estacionamiento"]:
        raise HTTPException(status_code=400, detail="Tramite inválido. Usa 'locker' o 'estacionamiento'.")

    if tramite == "estacionamiento":
        if not solicitud.placas or not solicitud.modelo or not solicitud.color:
            raise HTTPException(status_code=400, detail="Para tramitar un estacionamiento, los datos del vehículo como placas, modelo y color son obligatorios.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT id_alumno FROM alumno WHERE numero_cuenta = %s", (solicitud.numero_cuenta,))
        alumno_bd = cursor.fetchone()
        
        if not alumno_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="El número de cuenta no existe en el sistema.")
            
        id_alumno_real = alumno_bd[0]

        cursor.execute(
            "UPDATE alumno SET correo_electronico = %s WHERE id_alumno = %s", 
            (solicitud.correo_electronico, id_alumno_real)
        )

        cursor.execute(
            """
            SELECT id_solicitud FROM solicitud 
            WHERE id_alumno = %s AND tipo_tramite = %s AND estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'DATOS_INCOMPLETOS')
            """,
            (id_alumno_real, tramite)
        )
        solicitud_existente = cursor.fetchone()

        if solicitud_existente:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"Ya tienes una solicitud de {tramite} en proceso o activa.")

        cursor.execute(
            """
            INSERT INTO solicitud (id_alumno, tipo_tramite, estado) 
            VALUES (%s, %s, 'DATOS_INCOMPLETOS') RETURNING id_solicitud
            """,
            (id_alumno_real, tramite)
        )
        id_generado = cursor.fetchone()[0]

        if tramite == "estacionamiento":
            cursor.execute(
                """
                INSERT INTO vehiculo_solicitud (id_solicitud, placas, modelo, color)
                VALUES (%s, %s, %s, %s)
                """,
                (id_generado, solicitud.placas, solicitud.modelo, solicitud.color)
            )

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": f"Solicitud de {tramite} creada en borrador.",
            "id_solicitud": id_generado,
            "estado": "DATOS_INCOMPLETOS"
        }

    except HTTPException:
        raise 
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    




@router.post("/solicitudes/{id_solicitud}/documentos/", tags=["Alumno"], summary="Subir documentos a la solicitud del borrador")
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
        
        cursor.execute("SELECT nombre_tipo_documento FROM tipo_documento WHERE id_tipo_documento = %s", (id_tipo_documento,))
        tipo_doc_bd = cursor.fetchone()
        
        if not tipo_doc_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Tipo de documento no encontrado en el catálogo.")
            
        nombre_documento_legible = tipo_doc_bd[0]
        nombre_tipo_limpio = nombre_documento_legible.replace(" ", "_")
        nombre_seguro = f"{nombre_tipo_limpio}_solicitud_{id_solicitud}_{archivo.filename}"
        ruta_guardado = os.path.join(CARPETA_UPLOADS, nombre_seguro)

        with open(ruta_guardado, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)

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
        
        cursor.execute("""
            UPDATE solicitud
            SET estado = 'PENDIENTE'
            WHERE id_solicitud = %s AND estado = 'DOCUMENTACION_INCORRECTA'
        """, (id_solicitud,))
        
        cursor.execute("""
            SELECT a.numero_cuenta, s.tipo_tramite, s.estado FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno WHERE s.id_solicitud = %s
        """, (id_solicitud,))
        info_solicitud = cursor.fetchone()
        
        if info_solicitud and info_solicitud[2] != 'DATOS_INCOMPLETOS':
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





@router.post("/solicitudes/{id_solicitud}/enviar_solicitud", tags=["Alumno"], summary="Enviar solicitud completa y confirmar que los documentos han sido subidos completos")
def finalizar_solicitud(id_solicitud: int):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        cursor.execute("""
            SELECT tipo_tramite, estado FROM solicitud WHERE id_solicitud = %s
        """, (id_solicitud,))
        solicitud = cursor.fetchone()
        
        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        tramite = solicitud[0]
        estado_actual = solicitud[1]

        if estado_actual != 'DATOS_INCOMPLETOS':
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"La solicitud ya se encuentra en estado: {estado_actual}")

        cursor.execute("""
            SELECT COUNT(*) FROM tipo_documento 
            WHERE obligatorio = TRUE AND tramite_asociado IN (%s, 'ambos')
        """, (tramite,))
        documentos_requeridos = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM documentos_solicitud WHERE id_solicitud = %s
        """, (id_solicitud,))
        documentos_subidos = cursor.fetchone()[0]

        if documentos_subidos < documentos_requeridos:
            cursor.close()
            conexion.close()
            raise HTTPException(
                status_code=400, 
                detail=f"Faltan documentos. Has subido {documentos_subidos} de {documentos_requeridos} requeridos para {tramite}."
            )

        cursor.execute("""
            UPDATE solicitud SET estado = 'PENDIENTE', fecha_solicitud = CURRENT_TIMESTAMP WHERE id_solicitud = %s
        """, (id_solicitud,))
        
        cursor.execute("""
            INSERT INTO notificaciones (rol_destino, titulo, mensaje)
            VALUES ('REVISOR', 'Nueva Solicitud Completa', %s)
        """, (f"Una solicitud de {tramite} (ID: {id_solicitud}) ha completado sus documentos y está lista para revisión.",))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Documentos validados. Solicitud enviada a revisión correctamente.", 
            "nuevo_estado": "PENDIENTE"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")






@router.get("/solicitudes/{numero_cuenta}/general", tags=["Alumno"], summary="Obtener (folio, tramite, fecha, estado) de manera general del alumno")
def resumen_solicitud(numero_cuenta: str):
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

        cursor.execute("""
            SELECT id_solicitud, tipo_tramite, fecha_solicitud, estado 
            FROM solicitud 
            WHERE id_alumno = %s
            ORDER BY fecha_solicitud DESC
        """, (id_alumno,))

        filas = cursor.fetchall()
        resumen = []

        for fila in filas:
            resumen.append({
                "id_solicitud": fila[0],
                "folio": f"FOL-{fila[0]:04d}", 
                "tipo_tramite": fila[1],
                "fecha_solicitud": fila[2],
                "estado_solicitud": fila[3]
            })

        cursor.close()
        conexion.close()

        return {
            "numero_cuenta": numero_cuenta,
            "tramites": resumen
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")





@router.get("/solicitudes/{numero_cuenta}", tags=["Alumno"], summary="Obtener el historial de las solicitudes del alumno de forma detallada, asi como el documento, el estado y el comentario del administrador")
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
        solicitudes_dict = {}

        for fila in filas:
            id_sol = fila[0]
            if id_sol not in solicitudes_dict:
                solicitudes_dict[id_sol] = {
                    "id_solicitud": fila[0],
                    "folio": f"FOL-{fila[0]:04d}",
                    "tipo_tramite": fila[1],
                    "estado_solicitud": fila[2],
                    "documentos_tramite": []
                }
            if fila[8] is not None:
                solicitudes_dict[id_sol]["documentos_tramite"].append({
                    "id_tipo_documento": fila[4],
                    "archivo": fila[5],
                    "comentario_admin": fila[6],
                    "estado_documento": fila[7],
                    "id_documento": fila[8]
                })

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
    


class CambioContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str

@router.put("/alumno/{numero_cuenta}/contraseña", tags=["Alumno"], summary="Cambiar contraseña del alumno")
def cambiar_contrasena_alumno(numero_cuenta: str, datos: CambioContrasena):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        cursor.execute("SELECT contrasena_hash FROM alumno WHERE numero_cuenta = %s", (numero_cuenta,))
        resultado = cursor.fetchone()
        
        if not resultado:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Alumno no encontrado.")
            
        hash_bd = resultado[0]
        
    
        if not verificar_contrasena(datos.contrasena_actual, hash_bd):
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
            
    
        nuevo_hash = obtener_hash_contrasena(datos.contrasena_nueva)
        
        cursor.execute("""
            UPDATE alumno SET contrasena_hash = %s WHERE numero_cuenta = %s
        """, (nuevo_hash, numero_cuenta))
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": "Contraseña actualizada exitosamente."}

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    




@router.get("/alumno/{numero_cuenta}/detalles-tramite", tags=["Alumno"], summary="Obtener los detalles activos de los tramites (Locker / Estacionamiento) del alumno")
def obtener_recursos_activos(numero_cuenta: str):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        query = """
            SELECT 
                s.id_solicitud,
                s.tipo_tramite,
                ag.id_asignacion,
                ag.fecha_asignacion,
                l.codigo_locker,
                l.ubicacion,
                c.folio,
                c.qr_token,
                c.vigencia,
                c.estado as estado_documento,
                c.documento_path,
                v.placas,
                v.modelo,
                v.color -- Agregado: Extraemos el color de la base de datos
            FROM alumno a
            JOIN solicitud s ON a.id_alumno = s.id_alumno
            JOIN asignacion ag ON s.id_solicitud = ag.id_solicitud
            LEFT JOIN constancia c ON ag.id_asignacion = c.id_asignacion
            LEFT JOIN locker l ON ag.id_locker = l.id_locker
            LEFT JOIN vehiculo_solicitud v ON s.id_solicitud = v.id_solicitud
            WHERE a.numero_cuenta = %s AND ag.estado = 'ACTIVA'
        """
        cursor.execute(query, (numero_cuenta,))
        filas = cursor.fetchall()
        
        cursor.close()
        conexion.close()
        
        recursos = []
        for fila in filas:
            recurso = {
                "id_solicitud": fila[0],
                "tipo_tramite": fila[1],
                "fecha_asignacion": fila[3],
                "documento": None,
                "detalles_recurso": {}
            }
            
            
            if fila[6]:
                recurso["documento"] = {
                    "folio": fila[6],
                    "qr_token": str(fila[7]),
                    "vigencia": fila[8],
                    "estado": fila[9],
                    "url_descarga": f"/documentos/descargar/{str(fila[7])}",
                    "documento_path": fila[10] 
                }
                
            
            if fila[1] == 'locker':
                recurso["detalles_recurso"] = {
                    "codigo_locker": fila[4],
                    "ubicacion": fila[5]
                }
            elif fila[1] == 'estacionamiento':
                recurso["detalles_recurso"] = {
                    "placas": fila[11],
                    "modelo": fila[12],
                    "color": fila[13] 
                }
                
            recursos.append(recurso)
            
        return {"numero_cuenta": numero_cuenta, "recursos_activos": recursos}

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")