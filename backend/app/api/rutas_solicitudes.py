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

#  ESQUEMA DE DATOS 
class SolicitudCrear(BaseModel):
    numero_cuenta: str
    tipo_tramite: str # Recibe 'locker' o 'estacionamiento' de frontend

# CREAR SOLICITUD
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

        # Buscar el id_alumno usando el numero_cuenta
        cursor.execute("SELECT id_alumno FROM alumno WHERE numero_cuenta = %s", (solicitud.numero_cuenta,))
        alumno_bd = cursor.fetchone()
        
        if not alumno_bd:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="El número de cuenta no existe en el sistema.")
            
        id_alumno_real = alumno_bd[0]

        # Validar si ya tiene una solicitud pendiente o aprobada del mismo trámite
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

        # Insertar la nueva solicitud incluyendo el tipo de trámite
        cursor.execute(
            """
            INSERT INTO solicitud (id_alumno, tipo_tramite, estado) 
            VALUES (%s, %s, 'PENDIENTE') RETURNING id_solicitud
            """,
            (id_alumno_real, tramite)
        )
        nueva_solicitud = cursor.fetchone()
        conexion.commit()
        
        id_generado = nueva_solicitud[0]
        
        cursor.close()
        conexion.close()

        return {
            "mensaje": f"Solicitud de {tramite} creada con éxito.",
            "id_solicitud": id_generado
        }

    except HTTPException:
        raise 
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")

# SUBIR DOCUMENTO 
@router.post("/solicitudes/{id_solicitud}/documentos/")
async def subir_documento(
    id_solicitud: int, 
    id_tipo_documento: int = Form(1), # Consulta en el catálogo de la base de datos (1: INE, 2: Tira, etc.)
    archivo: UploadFile = File(...)
):
    # Validar extensión
    extensiones_permitidas = ["pdf", "jpg", "jpeg", "png"]
    extension = archivo.filename.split(".")[-1].lower()
    
    if extension not in extensiones_permitidas:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo PDF, JPG o PNG.")

    # Validar peso (5MB)
    contenido = await archivo.read()
    if len(contenido) > 5242880:
        raise HTTPException(status_code=400, detail="El archivo es demasiado pesado. Máximo 5MB.")
    
    await archivo.seek(0)

    # Guardado físico
    nombre_seguro = f"solicitud_{id_solicitud}_{archivo.filename}"
    ruta_guardado = os.path.join(CARPETA_UPLOADS, nombre_seguro)

    with open(ruta_guardado, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    # Guardado en BD unificado con la ruta de trabajo
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error en la base de datos")

    try:
        cursor = conexion.cursor()
        # Se apunta a la tabla 'documentos_solicitud' y las columnas 'archivo_path' y 'estado'
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
    

##############################################################
###########Cambios Agregados Vic##############################

# CONSULTAR SOLICITUDES POR NUMERO DE CUENTA 
@router.get("/solicitudes/{numero_cuenta}")
def consultar_solicitudes_por_alumno(numero_cuenta: str):

    conexion = conectar_base()

    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # Buscar alumno
        cursor.execute(
            """
            SELECT id_alumno, nombre, apellidos
            FROM alumno
            WHERE numero_cuenta = %s
            """,
            (numero_cuenta,)
        )

        alumno = cursor.fetchone()

        if not alumno:
            cursor.close()
            conexion.close()

            raise HTTPException(
                status_code=404,
                detail="Alumno no encontrado"
            )

        id_alumno = alumno[0]

        # Consultar solicitudes y documentos
        cursor.execute(
            """
            SELECT
                s.id_solicitud,
                s.tipo_tramite,
                s.estado,
                ds.id_documento,
                ds.archivo_path
            FROM solicitud s
            LEFT JOIN documentos_solicitud ds
                ON s.id_solicitud = ds.id_solicitud
            WHERE s.id_alumno = %s
            ORDER BY s.id_solicitud
            """,
            (id_alumno,)
        )

        resultados = cursor.fetchall()

        cursor.close()
        conexion.close()

        return {
            "numero_cuenta": numero_cuenta,
            "solicitudes": resultados
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en BD: {str(e)}"
        )