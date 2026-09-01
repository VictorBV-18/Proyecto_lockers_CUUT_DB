from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from app.db.conexion import conectar_base
from datetime import datetime
from app.utils.notificaciones import enviar_correo_rechazo_guardia, enviar_correo_bloqueo
import os
import shutil

router = APIRouter()
CARPETA_UPLOADS = "uploads"

class RegistroAcceso(BaseModel):
    id_guardia: int
    id_asignacion: int
    identidad_confirmada: bool
    vehiculo_coincide: bool

@router.get("/guardia/verificar/{qr_token}", tags=["Guardia"], summary="Escanear código QR y obtener datos del alumno y vehículo")
def verificar_qr_acceso(qr_token: str):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")
        
    try:
        cursor = conexion.cursor()
        
        query_principal = """
            SELECT 
                c.estado as estado_documento, 
                c.vigencia,
                s.tipo_tramite,
                a.nombre, 
                a.apellidos, 
                a.numero_cuenta, 
                a.carrera,
                c.id_asignacion,
                s.id_solicitud
            FROM constancia c
            JOIN asignacion asg ON c.id_asignacion = asg.id_asignacion
            JOIN solicitud s ON asg.id_solicitud = s.id_solicitud
            JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE c.qr_token = %s::uuid;
        """
        cursor.execute(query_principal, (qr_token,))
        resultado = cursor.fetchone()
        
        if not resultado:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Código QR inválido o no encontrado en el sistema.")
            
        estado_doc = resultado[0]
        vigencia = resultado[1]
        tipo_tramite = resultado[2].lower()
        id_solicitud = resultado[8]
        
        if datetime.now().date() > vigencia and estado_doc == 'VIGENTE':
            estado_doc = 'VENCIDO'
            
        respuesta = {
            "estado_acceso": estado_doc,
            "id_asignacion": resultado[7],
            "tipo_tramite": tipo_tramite.upper(),
            "alumno": {
                "nombre_completo": f"{resultado[3]} {resultado[4]}",
                "numero_cuenta": resultado[5],
                "carrera": resultado[6]
            },
            "vehiculo": None
        }
        
        if tipo_tramite == 'estacionamiento':
            cursor.execute("SELECT placas, modelo, color FROM vehiculo_solicitud WHERE id_solicitud = %s", (id_solicitud,))
            vehiculo_bd = cursor.fetchone()
            if vehiculo_bd:
                respuesta["vehiculo"] = {
                    "placas": vehiculo_bd[0], 
                    "modelo": vehiculo_bd[1], 
                    "color": vehiculo_bd[2]
                }
            
        cursor.close()
        conexion.close()
            
        return respuesta

    except ValueError:
        raise HTTPException(status_code=400, detail="El formato del código QR es incorrecto.")
    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")

@router.post("/guardia/registrar-acceso", tags=["Guardia"], summary="Registrar entrada o reporte con evidencia fotográfica")
async def registrar_auditoria_acceso(
    id_guardia: int = Form(...),
    id_asignacion: int = Form(...),
    identidad_confirmada: bool = Form(...),
    vehiculo_coincide: bool = Form(...),
    motivo: str = Form(None),
    evidencia: UploadFile = File(None)
):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")
        
    acceso_permitido = identidad_confirmada and vehiculo_coincide
    nombre_evidencia = None

    try:
        cursor = conexion.cursor()

        if not acceso_permitido and evidencia:
            nombre_evidencia = f"evidencia_asig{id_asignacion}_{evidencia.filename}"
            ruta = os.path.join(CARPETA_UPLOADS, nombre_evidencia)
            with open(ruta, "wb") as buffer:
                shutil.copyfileobj(evidencia.file, buffer)

        cursor.execute("""
            INSERT INTO auditoria_acceso (id_guardia, id_asignacion, identidad_confirmada, vehiculo_coincide, motivo, evidencia_path)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_acceso;
        """, (id_guardia, id_asignacion, identidad_confirmada, vehiculo_coincide, motivo, nombre_evidencia))
        id_acceso = cursor.fetchone()[0]

        estado_msg = "Acceso autorizado."

        if not acceso_permitido:
            cursor.execute("""
                SELECT al.id_alumno, al.correo_electronico, al.nombre, al.apellidos, al.numero_cuenta
                FROM asignacion ag
                JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
                JOIN alumno al ON s.id_alumno = al.id_alumno
                WHERE ag.id_asignacion = %s
            """, (id_asignacion,))
            alumno_data = cursor.fetchone()

            if alumno_data:
                id_alumno, correo, nombre, apellidos, cuenta = alumno_data
                nombre_completo = f"{nombre} {apellidos}"
                
                cursor.execute("""
                    SELECT COUNT(*) FROM auditoria_acceso au
                    JOIN asignacion a ON au.id_asignacion = a.id_asignacion
                    JOIN solicitud s ON a.id_solicitud = s.id_solicitud
                    WHERE s.id_alumno = %s AND (au.identidad_confirmada = FALSE OR au.vehiculo_coincide = FALSE)
                """, (id_alumno,))
                strikes = cursor.fetchone()[0]

                motivo_seguro = motivo if motivo else "Datos del vehículo o del alumno no coinciden"

                if strikes >= 3:
                    cursor.execute("UPDATE alumno SET estado_activo = FALSE WHERE id_alumno = %s", (id_alumno,))
                    
                    cursor.execute("""
                        UPDATE asignacion SET estado = 'BLOQUEADA' 
                        FROM solicitud s 
                        WHERE asignacion.id_solicitud = s.id_solicitud AND s.id_alumno = %s
                    """, (id_alumno,))

                    cursor.execute("""
                        UPDATE constancia c SET estado = 'BLOQUEADO'
                        FROM asignacion a, solicitud s
                        WHERE c.id_asignacion = a.id_asignacion
                          AND a.id_solicitud = s.id_solicitud
                          AND s.id_alumno = %s
                    """, (id_alumno,))
                    
                    enviar_correo_bloqueo(correo, nombre_completo)
                    estado_msg = "Acceso denegado. Límite de 3 advertencias alcanzado. Cuenta y permiso bloqueados."
                else:
                    enviar_correo_rechazo_guardia(correo, nombre_completo, motivo_seguro)
                    cursor.execute("""
                        INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje) 
                        VALUES (%s, 'ALUMNO', %s, %s)
                    """, (cuenta, f"Acceso Denegado (Advertencia {strikes}/3)", f"Se te negó el acceso por: {motivo_seguro}"))
                    estado_msg = f"Reporte guardado. Se notificó al alumno. (Advertencia {strikes}/3)"

        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": estado_msg, "id_acceso": id_acceso}

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")