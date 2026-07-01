from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
from app.utils.notificaciones import enviar_correo_rechazo, enviar_correo_documento
from enum import Enum 
from datetime import datetime, timedelta
import os
from fastapi.responses import FileResponse
from app.utils.generador_pdf import generar_documento

router = APIRouter()

class OpcionesEstadoDocumento(str, Enum):
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"

class ActualizarEstadoDocumento(BaseModel):
    id_admin: int 
    estado: OpcionesEstadoDocumento
    comentario: str | None = None

class RechazarSolicitud(BaseModel):
    id_admin: int
    motivo: str


class GenerarDocumentoRequest(BaseModel):
    id_admin: int
    meses_vigencia: int = 4

class AprobarEstacionamiento(BaseModel):
    id_admin: int
    comentario: str | None = "Solicitud de estacionamiento aprobada."

class AprobarLocker(BaseModel):
    id_admin: int
    id_locker: int
    comentario: str | None = "Solicitud aprobada y locker asignado."



@router.get("/solicitudes/{id_solicitud}/detalle", tags=["Administrador / Personal"], summary="Obtener documentos de una solicitud para revisión")
def obtener_detalle_solicitud(id_solicitud: int):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT
                s.id_solicitud,
                s.tipo_tramite,
                s.estado,
                a.numero_cuenta,
                a.nombre || ' ' || a.apellidos AS nombre_completo,
                s.fecha_solicitud,
                ds.id_documento,
                ds.id_tipo_documento,
                td.nombre_tipo_documento,
                ds.archivo_path,
                ds.estado AS estado_documento,
                ds.comentario
            FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno
            LEFT JOIN documentos_solicitud ds ON s.id_solicitud = ds.id_solicitud
            LEFT JOIN tipo_documento td ON ds.id_tipo_documento = td.id_tipo_documento
            WHERE s.id_solicitud = %s
            ORDER BY ds.id_tipo_documento
        """, (id_solicitud,))

        filas = cursor.fetchall()
        cursor.close()
        conexion.close()

        if not filas:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        primera = filas[0]
        detalle = {
            "id_solicitud": primera[0],
            "tipo_tramite": primera[1],
            "estado": primera[2],
            "numero_cuenta": primera[3],
            "nombre_completo": primera[4],
            "fecha_solicitud": primera[5],
            "documentos": []
        }

        for fila in filas:
            if fila[6] is not None:
                detalle["documentos"].append({
                    "id_documento": fila[6],
                    "id_tipo_documento": fila[7],
                    "nombre_tipo_documento": fila[8],
                    "archivo": fila[9],
                    "estado_documento": fila[10],
                    "comentario_admin": fila[11]
                })

        return detalle

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


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
            WHERE s.estado != 'DATOS_INCOMPLETOS'
        """
        parametros = []

        if tipo_tramite:
            query += " AND s.tipo_tramite = %s"
            parametros.append(tipo_tramite.lower())
            
        if estado:
            query += " AND s.estado = %s"
            parametros.append(estado.upper())
            
        if fecha:
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
            raise HTTPException(status_code=400, detail="Debe proporcionar un comentario explicando por qué se rechaza el documento.")
    elif estado_texto == "APROBADO":
        comentario_final = None

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT id_documento FROM documentos_solicitud
            WHERE id_solicitud = %s AND id_documento = %s
        """, (id_solicitud, id_documento))

        if not cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Documento no encontrado o no pertenece a la solicitud.")

        cursor.execute("""
            UPDATE documentos_solicitud
            SET estado = %s, comentario = %s
            WHERE id_solicitud = %s AND id_documento = %s
        """, (estado_texto, comentario_final, id_solicitud, id_documento))

        cursor.execute("""
            UPDATE solicitud
            SET revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s AND estado = 'PENDIENTE'
        """, (datos.id_admin, id_solicitud))

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


@router.post("/solicitudes/{id_solicitud}/rechazar", tags=["Administrador / Personal"], summary="Rechazar solicitud completa y notificar via correo electronico")
def rechazar_solicitud(id_solicitud: int, datos: RechazarSolicitud):
    if not datos.motivo or datos.motivo.strip() == "":
        raise HTTPException(status_code=400, detail="El motivo de rechazo es obligatorio.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

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
            raise HTTPException(status_code=400, detail="Esta solicitud ya ha sido rechazada anteriormente.")
            
        if estado_anterior == "APROBADA":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud ya está aprobada, no se puede rechazar.")

        tramite = solicitud_actual[1]
        nombre_completo = f"{solicitud_actual[2]} {solicitud_actual[3]}" 
        correo_alumno = solicitud_actual[4] 
        num_cuenta_alumno = solicitud_actual[5]
        nuevo_estado = "DOCUMENTACION_INCORRECTA"

        cursor.execute("""
            UPDATE solicitud
            SET estado = %s, revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s
        """, (nuevo_estado, datos.id_admin, id_solicitud))

        cursor.execute("""
            INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario)
            VALUES (%s, %s, %s, %s, %s)
        """, (id_solicitud, estado_anterior, nuevo_estado, datos.id_admin, datos.motivo))
        
        cursor.execute("""
            INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje)
            VALUES (%s, 'ALUMNO', 'Trámite Rechazado', %s)
        """, (num_cuenta_alumno, f"Tu solicitud de {tramite} fue rechazada. Revisa tu correo o el sistema para corregir."))

        conexion.commit()

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



# endpoint aprobar lockers
@router.post("/solicitudes/{id_solicitud}/aprobar-locker", tags=["Administrador / Personal"], summary="Aprobar solicitud de locker y asignar")
def aprobar_solicitud_locker(id_solicitud: int, datos: AprobarLocker):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            SELECT s.id_solicitud, s.estado, s.tipo_tramite, a.numero_cuenta
            FROM solicitud s JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE s.id_solicitud = %s;
        """, (id_solicitud,))
        solicitud = cursor.fetchone()

        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        estado_actual, tipo_tramite, numero_cuenta = solicitud[1], solicitud[2], solicitud[3]

        if tipo_tramite.lower() != "locker":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud no es de tipo locker.")

        if estado_actual != "PENDIENTE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"La solicitud no se puede aprobar porque está en estado {estado_actual}.")

        cursor.execute("SELECT COUNT(*) FROM documentos_solicitud WHERE id_solicitud = %s AND estado != 'APROBADO';", (id_solicitud,))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede aprobar la solicitud porque aún hay documentos sin aprobar.")

        cursor.execute("SELECT id_locker, codigo_locker, ubicacion, estado FROM locker WHERE id_locker = %s;", (datos.id_locker,))
        locker = cursor.fetchone()

        if not locker:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        if locker[3] != "DISPONIBLE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"El locker no está disponible. Estado actual: {locker[3]}.")

        cursor.execute("UPDATE solicitud SET estado = 'APROBADA', revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP WHERE id_solicitud = %s;", (datos.id_admin, id_solicitud))
        
        cursor.execute("INSERT INTO asignacion (id_solicitud, id_locker, estado) VALUES (%s, %s, 'ACTIVA') RETURNING id_asignacion;", (id_solicitud, datos.id_locker))
        id_asignacion = cursor.fetchone()[0]

        cursor.execute("UPDATE locker SET estado = 'OCUPADO' WHERE id_locker = %s;", (datos.id_locker,))
        
        cursor.execute("INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario) VALUES (%s, %s, %s, %s, %s);", (id_solicitud, estado_actual, "APROBADA", datos.id_admin, datos.comentario))
        
        cursor.execute("INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje) VALUES (%s, 'ALUMNO', 'Solicitud de locker aprobada', %s);", (numero_cuenta, f"Tu solicitud de locker fue aprobada. Se te asignó el locker {locker[1]} ubicado en {locker[2]}."))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Solicitud de locker aprobada correctamente.",
            "id_solicitud": id_solicitud,
            "id_asignacion": id_asignacion,
            "locker_asignado": {
                "id_locker": locker[0],
                "codigo_locker": locker[1],
                "ubicacion": locker[2],
                "estado": "OCUPADO"
            },
            "estado_solicitud": "APROBADA"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")



# endpoint aprobar estacionamiento
@router.post("/solicitudes/{id_solicitud}/aprobar-estacionamiento", tags=["Administrador / Personal"], summary="Aprobar solicitud de estacionamiento")
def aprobar_solicitud_estacionamiento(id_solicitud: int, datos: AprobarEstacionamiento):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT s.id_solicitud, s.estado, s.tipo_tramite, a.numero_cuenta
            FROM solicitud s JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE s.id_solicitud = %s;
        """, (id_solicitud,))
        solicitud = cursor.fetchone()

        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        estado_actual, tipo_tramite, numero_cuenta = solicitud[1], solicitud[2], solicitud[3]

        if tipo_tramite.lower() != "estacionamiento":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud no es de tipo estacionamiento.")

        if estado_actual != "PENDIENTE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"La solicitud no se puede aprobar porque está en estado {estado_actual}.")

        cursor.execute("SELECT COUNT(*) FROM documentos_solicitud WHERE id_solicitud = %s AND estado != 'APROBADO';", (id_solicitud,))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede aprobar la solicitud porque aún hay documentos sin aprobar.")

        cursor.execute("UPDATE solicitud SET estado = 'APROBADA', revisado_por = %s, fecha_revision = CURRENT_TIMESTAMP WHERE id_solicitud = %s;", (datos.id_admin, id_solicitud))
        
        # Crear asignación sin locker (NULL)
        cursor.execute("INSERT INTO asignacion (id_solicitud, id_locker, estado) VALUES (%s, NULL, 'ACTIVA') RETURNING id_asignacion;", (id_solicitud,))
        id_asignacion = cursor.fetchone()[0]
        
        cursor.execute("INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario) VALUES (%s, %s, %s, %s, %s);", (id_solicitud, estado_actual, "APROBADA", datos.id_admin, datos.comentario))
        
        cursor.execute("INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje) VALUES (%s, 'ALUMNO', 'Solicitud de estacionamiento aprobada', %s);", (numero_cuenta, "Tu solicitud de estacionamiento fue aprobada correctamente. Estás listo para generar tu tarjetón."))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Solicitud de estacionamiento aprobada correctamente.",
            "id_solicitud": id_solicitud,
            "id_asignacion": id_asignacion,
            "estado_solicitud": "APROBADA"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")



@router.post("/solicitudes/{id_solicitud}/aceptar", tags=["Administrador / Personal"], summary="Aceptar solicitud completa, notificar via correo electronico y generar constancia o tarjeton con QR")
def aceptar_solicitud_y_generar_documento(id_solicitud: int, datos: GenerarDocumentoRequest):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        cursor.execute("""
            SELECT a.id_asignacion, s.id_solicitud, s.tipo_tramite, s.estado, al.id_alumno, al.nombre, al.apellidos, al.numero_cuenta, al.correo_electronico, l.codigo_locker, l.ubicacion
            FROM asignacion a
            JOIN solicitud s ON a.id_solicitud = s.id_solicitud
            JOIN alumno al ON s.id_alumno = al.id_alumno
            LEFT JOIN locker l ON a.id_locker = l.id_locker
            WHERE s.id_solicitud = %s AND a.estado = 'ACTIVA';
        """, (id_solicitud,))
        
        info = cursor.fetchone()
        if not info:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se encontró una asignación activa para esta solicitud. Debes aprobar el recurso (locker/estacionamiento) primero.")
            
        id_asignacion, id_sol_bd, tipo_tramite, estado_solicitud, id_alumno, nombre_al, apellidos_al, num_cuenta, correo_alumno, cod_locker, ubi_locker = info
        nombre_completo = f"{nombre_al} {apellidos_al}"
        
        cod_locker = cod_locker if cod_locker else "N/A"
        ubi_locker = ubi_locker if ubi_locker else "N/A"

        if estado_solicitud != 'APROBADA':
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="La solicitud debe estar APROBADA para generar el documento.")

        cursor.execute("SELECT id_constancia FROM constancia WHERE id_asignacion = %s;", (id_asignacion,))
        if cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Ya se generó un documento oficial para esta solicitud.")

        fecha_vigencia_obj = datetime.now() + timedelta(days=30 * datos.meses_vigencia)
        fecha_vigencia_str = fecha_vigencia_obj.strftime('%Y-%m-%d')
        
        folio = f"{tipo_tramite[:3].upper()}-{id_asignacion}-{datetime.now().strftime('%m%d')}"

        cursor.execute("""
            INSERT INTO constancia (id_asignacion, folio, vigencia, documento_path)
            VALUES (%s, %s, %s, %s)
            RETURNING qr_token, id_constancia;
        """, (id_asignacion, folio, fecha_vigencia_str, 'pendiente.pdf'))
        
        resultado_insert = cursor.fetchone()
        qr_token = str(resultado_insert[0])
        
        nombre_archivo_pdf = generar_documento(
            folio=folio,
            token_qr=qr_token,
            nombre_alumno=nombre_completo,
            cuenta_alumno=num_cuenta,
            tipo_tramite=tipo_tramite,
            vigencia=fecha_vigencia_str,
            codigo_locker=cod_locker,
            ubicacion_locker=ubi_locker
        )
        
        cursor.execute("""
            UPDATE constancia SET documento_path = %s WHERE id_asignacion = %s;
        """, (nombre_archivo_pdf, id_asignacion))

        cursor.execute("""
            INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario)
            VALUES (%s, 'APROBADA', 'DOCUMENTO_GENERADO', %s, %s)
        """, (id_solicitud, datos.id_admin, f"Se generó el documento con folio {folio}."))
        
        correo_enviado = enviar_correo_documento(correo_alumno, nombre_completo, tipo_tramite, nombre_archivo_pdf)
        
        conexion.commit()
        cursor.close()
        conexion.close()

        mensaje_respuesta = "Solicitud aceptada y documento generado exitosamente."
        if not correo_enviado:
            mensaje_respuesta += " (Pero falló el envío de correo)."

        return {
            "mensaje": mensaje_respuesta,
            "folio": folio,
            "qr_token": qr_token,
            "archivo": nombre_archivo_pdf
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD/Motor: {str(e)}")


@router.get("/documentos/descargar/{qr_token}", tags=["Administrador / Personal", "Alumno"], summary="Descargar el PDF de un trámite")
def descargar_documento(qr_token: str):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")
        
    try:
        cursor = conexion.cursor()
        cursor.execute("""
            SELECT documento_path, estado FROM constancia WHERE qr_token = %s::uuid;
        """, (qr_token,))
        
        resultado = cursor.fetchone()
        cursor.close()
        conexion.close()
        
        if not resultado:
            raise HTTPException(status_code=404, detail="Documento no encontrado o código inválido.")
            
        archivo_path = resultado[0]
        estado = resultado[1]
        
        if estado != 'VIGENTE':
             raise HTTPException(status_code=400, detail=f"No se puede descargar. El documento está {estado}.")
             
        ruta_completa = os.path.join("uploads", archivo_path)
        
        if not os.path.exists(ruta_completa):
            raise HTTPException(status_code=404, detail="El archivo físico ya no existe en el servidor.")
            
        return FileResponse(path=ruta_completa, filename=archivo_path, media_type='application/pdf')

    except HTTPException:
        raise
    except ValueError:
         raise HTTPException(status_code=400, detail="Formato de token inválido.")
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")