from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
from app.utils.notificaciones import enviar_correo_rechazo 
from enum import Enum 

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