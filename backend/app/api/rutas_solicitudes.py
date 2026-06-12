from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
import shutil
import os

router = APIRouter()

# Carpeta donde se guardan los documentos
CARPETA_UPLOADS = "uploads"
if not os.path.exists(CARPETA_UPLOADS):
    os.makedirs(CARPETA_UPLOADS)


# ESQUEMAS DE DATOS
class SolicitudCrear(BaseModel):
    numero_cuenta: str
    tipo_tramite: str # Se recibe locker o estacionamiento del frontend
    observacion: str | None = None 

class ActualizarEstadoSolicitud(BaseModel):
    estado: str
    comentario: str | None = None



# ENDPOINTS ALUMNO

# Crear solicitud
@router.post("/solicitudes/")
def crear_solicitud(solicitud: SolicitudCrear):
    tramite = solicitud.tipo_tramite.lower()
    if tramite not in ["locker", "estacionamiento"]:
        raise HTTPException(status_code=400, detail="Trámite inválido. Usa 'locker' o 'estacionamiento'.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # Se busca el id_alumno usando el numero_cuenta
        cursor.execute("SELECT id_alumno FROM alumno WHERE numero_cuenta = %s", (solicitud.numero_cuenta,))
        alumno_bd = cursor.fetchone()
        
        if not alumno_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="El número de cuenta no existe en el sistema.")
            
        id_alumno_real = alumno_bd[0]

        # Se validar si ya tiene una solicitud pendiente o aprobada
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

        # Se crea la nueva solicitud
        cursor.execute(
            """
            INSERT INTO solicitud (id_alumno, tipo_tramite, estado, observacion_alumno) 
            VALUES (%s, %s, 'PENDIENTE', %s) RETURNING id_solicitud
            """,
            (id_alumno_real, tramite, solicitud.observacion)
        )
        nueva_solicitud = cursor.fetchone()
        conexion.commit()
        
        id_generado = nueva_solicitud[0]
        
        cursor.close()
        conexion.close()

        return {
            "mensaje": f"Solicitud de {tramite} creada con éxito.",
            "id_solicitud": id_generado,
            "observacion_registrada": solicitud.observacion
        }

    except HTTPException:
        raise 
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")

# Subir documentos 
@router.post("/solicitudes/{id_solicitud}/documentos/")
async def subir_documento(
    id_solicitud: int, 
    id_tipo_documento: int = Form(...), # Consulta en el catálogo de BD (1: INE, 2: Tira, etc.)
    archivo: UploadFile = File(...)
):
    # Validar formato
    extensiones_permitidas = ["pdf", "jpg", "jpeg", "png"]
    extension = archivo.filename.split(".")[-1].lower()
    
    if extension not in extensiones_permitidas:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo PDF, JPG o PNG.")

    # Validar peso (5MB)
    contenido = await archivo.read()
    if len(contenido) > 5242880:
        raise HTTPException(status_code=400, detail="El archivo es demasiado pesado. Máximo 5MB.")
    
    await archivo.seek(0)

    # Guardado en la carpeta
    nombre_seguro = f"solicitud_{id_solicitud}_{archivo.filename}"
    ruta_guardado = os.path.join(CARPETA_UPLOADS, nombre_seguro)

    with open(ruta_guardado, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error en la base de datos")

    try:
        cursor = conexion.cursor()
        query_doc = """
            INSERT INTO documentos_solicitud (id_solicitud, id_tipo_documento, archivo_path, estado) 
            VALUES (%s, %s, %s, 'PENDIENTE')
        """
        cursor.execute(query_doc, (id_solicitud, id_tipo_documento, nombre_seguro))
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": "Documento subido exitosamente a la BD y carpeta", "archivo": nombre_seguro}

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error al guardar en BD: {str(e)}")
    
# Consiltar solicitudes por numero de cuenta (codigo vic)
@router.get("/solicitudes/{numero_cuenta}")
def consultar_solicitudes_por_alumno(numero_cuenta: str):
    conexion = conectar_base()

    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            SELECT id_alumno
            FROM alumno
            WHERE numero_cuenta = %s
            """,
            (numero_cuenta,)
        )
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
                ds.comentario
            FROM solicitud s
            LEFT JOIN documentos_solicitud ds
                ON s.id_solicitud = ds.id_solicitud
            WHERE s.id_alumno = %s
            ORDER BY s.id_solicitud, ds.id_tipo_documento
            """,
            (id_alumno,)
        )

        filas = cursor.fetchall()
        solicitudes = []

        for fila in filas:
            solicitudes.append({
                "id_solicitud": fila[0],
                "tipo_tramite": fila[1],
                "estado_solicitud": fila[2],
                "observacion_alumno": fila[3],
                "id_tipo_documento": fila[4],
                "archivo": fila[5],
                "comentario_admin": fila[6] 
            })

        cursor.close()
        conexion.close()

        return {
            "numero_cuenta": numero_cuenta,
            "solicitudes": solicitudes
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    

# ENDPOINTS ADMINISTRADOR


# Actualizar estado de la solicitud (Codigo de Diego)
@router.put("/solicitudes/{id_solicitud}/estado")
def actualizar_estado_solicitud(
    id_solicitud: int,
    datos: ActualizarEstadoSolicitud
):
    # Si es incorrecto tiene que mandar comentario obligatoriamente 
    if datos.estado.upper() == "DOCUMENTACION_INCORRECTA":
        if not datos.comentario or datos.comentario.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Debe proporcionar un comentario cuando la documentación es incorrecta"
            )

    conexion = conectar_base()

    if conexion is None:
        raise HTTPException(
            status_code=500,
            detail="Error de conexión a la BD"
        )

    try:
        cursor = conexion.cursor()

        # Verificar que exista la solicitud
        cursor.execute(
            """
            SELECT id_solicitud
            FROM solicitud
            WHERE id_solicitud = %s
            """,
            (id_solicitud,)
        )

        solicitud = cursor.fetchone()

        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(
                status_code=404,
                detail="Solicitud no encontrada"
            )

        # Actualizar estado de la solicitud
        cursor.execute(
            """
            UPDATE solicitud
            SET estado = %s
            WHERE id_solicitud = %s
            """,
            (datos.estado, id_solicitud)
        )

        # Actualizar estado y comentario de los documentos 
        cursor.execute(
            """
            UPDATE documentos_solicitud
            SET estado = %s, comentario = %s
            WHERE id_solicitud = %s
            """,
            (datos.estado, datos.comentario, id_solicitud)
        )

        conexion.commit()

        cursor.close()
        conexion.close()

        return {
            "mensaje": "Estado actualizado correctamente en sistema y documentos",
            "id_solicitud": id_solicitud,
            "estado_nuevo": datos.estado,
            "comentario_guardado": datos.comentario
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(
            status_code=500,
            detail=f"Error en BD: {str(e)}"
        )