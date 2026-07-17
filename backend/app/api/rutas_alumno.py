from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.db.conexion import conectar_base
from pathlib import Path
import mimetypes
import shutil
import os



router = APIRouter()

# Carpeta donde se guardan los documentos
CARPETA_UPLOADS = Path(__file__).resolve().parents[2] / "uploads"

if not CARPETA_UPLOADS.exists():
    CARPETA_UPLOADS.mkdir(parents=True, exist_ok=True)



class SolicitudCrear(BaseModel):
    numero_cuenta: str
    tipo_tramite: str 
    correo_electronico: str 





# Endpoint - Crear nueva solicitud como borrador, con un estado "DOCUMENTOS_INCOMPLETOS"
@router.post("/solicitudes/", tags=["Alumno"], summary="Crear una nueva solicitud de tramite (Borrador)")
def crear_solicitud(solicitud: SolicitudCrear):
    tramite = solicitud.tipo_tramite.lower()
    if tramite not in ["locker", "estacionamiento"]:
        raise HTTPException(status_code=400, detail="Tramite inválido. Usa 'locker' o 'estacionamiento'.")

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
        nueva_solicitud = cursor.fetchone()
        id_generado = nueva_solicitud[0]

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
    




# Endpoint - Subida de documentos por tramite
@router.post("/solicitudes/{id_solicitud}/documentos/", tags=["Alumno"], summary="Subir documentos a la solicitud")
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
        ruta_guardado = CARPETA_UPLOADS / nombre_seguro

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





# Endpoint - FINALIZAR TRAMITE Valida que estén todos los PDFs
@router.post("/solicitudes/{id_solicitud}/enviar_solicitud", tags=["Alumno"], summary="Enviar solicitud completa y que los documentos han sido subidos completos")
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





# Endpoint - Obtener de forma general los datos de los tramites del alumno
@router.get("/solicitudes/{numero_cuenta}/general", tags=["Alumno"], summary="Obtener de forma general los datos de los tramites del alumno")
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





# Endpoint - Consultar historial de solicitudes con TODOS los documentos anidados
@router.get(
    "/solicitudes/{numero_cuenta}",
    tags=["Alumno"],
    summary="Obtener el historial de las solicitudes del alumno de forma detallada"
)
def consultar_solicitudes_por_alumno(
    numero_cuenta: str,
    request: Request
):
    base_url = str(request.base_url).rstrip("/")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(
            status_code=500,
            detail="Error de conexión a la BD"
        )

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

            raise HTTPException(
                status_code=404,
                detail="Alumno no encontrado"
            )

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
                ds.id_documento,

                c.qr_token,
                c.folio AS folio_documento,
                c.vigencia,
                c.estado AS estado_constancia,
                c.documento_path

            FROM solicitud s

            LEFT JOIN documentos_solicitud ds
                ON s.id_solicitud = ds.id_solicitud

            LEFT JOIN asignacion a
                ON s.id_solicitud = a.id_solicitud

            LEFT JOIN constancia c
                ON a.id_asignacion = c.id_asignacion

            WHERE s.id_alumno = %s

            ORDER BY
                s.id_solicitud,
                ds.id_tipo_documento
            """,
            (id_alumno,)
        )

        filas = cursor.fetchall()
        solicitudes_dict = {}

        for fila in filas:
            id_solicitud = fila[0]

            if id_solicitud not in solicitudes_dict:
                qr_token = str(fila[9]) if fila[9] else ""

                solicitudes_dict[id_solicitud] = {
                    "id_solicitud": id_solicitud,
                    "folio": f"FOL-{id_solicitud:04d}",
                    "tipo_tramite": fila[1],
                    "estado_solicitud": fila[2],
                    "qr_token": qr_token,
                    "documento_emitido": {
                        "folio": fila[10] or "",
                        "vigencia": fila[11],
                        "estado": fila[12] or "",
                        "documento_path": fila[13] or "",
                        "url_descarga": (
                            f"{base_url}/documentos/descargar/{qr_token}"
                            if qr_token
                            else ""
                        )
                    },
                    "documentos_tramite": []
                }

            if fila[8] is not None:
                id_documento = fila[8]

                solicitudes_dict[id_solicitud]["documentos_tramite"].append({
                    "id_tipo_documento": fila[4],
                    "archivo": fila[5],
                    "comentario_admin": fila[6],
                    "estado_documento": fila[7],
                    "id_documento": id_documento,
                    "documento_url": (
                        f"{base_url}/documentos/solicitud/{id_documento}"
                    )
                })

        solicitudes = list(solicitudes_dict.values())

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

        raise HTTPException(
            status_code=500,
            detail=f"Error en BD: {str(e)}"
        )

# Endpoint - Visualizar documento subido por el alumno
@router.get(
    "/documentos/solicitud/{id_documento}",
    tags=["Alumno", "Administrador / Personal"],
    summary="Visualizar documento subido por el alumno"
)
def visualizar_documento_solicitud(id_documento: int):
    conexion = conectar_base()

    if conexion is None:
        raise HTTPException(
            status_code=500,
            detail="Error de conexión a la BD"
        )

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT archivo_path
            FROM documentos_solicitud
            WHERE id_documento = %s
        """, (id_documento,))

        resultado = cursor.fetchone()

        cursor.close()
        conexion.close()

        if not resultado:
            raise HTTPException(
                status_code=404,
                detail="Documento no encontrado."
            )

        nombre_archivo = resultado[0]

        if not nombre_archivo:
            raise HTTPException(
                status_code=404,
                detail="El documento no tiene archivo registrado."
            )

        ruta_archivo = CARPETA_UPLOADS / Path(nombre_archivo).name

        if not ruta_archivo.exists() or not ruta_archivo.is_file():
            raise HTTPException(
                status_code=404,
                detail="El archivo físico no existe en el servidor."
            )

        tipo_mime, _ = mimetypes.guess_type(str(ruta_archivo))

        return FileResponse(
            path=str(ruta_archivo),
            media_type=tipo_mime or "application/octet-stream",
            filename=ruta_archivo.name,
            content_disposition_type="inline"
        )

    except HTTPException:
        raise

    except Exception as e:
        if conexion:
            conexion.close()

        raise HTTPException(
            status_code=500,
            detail=f"Error al abrir el documento: {str(e)}"
        )