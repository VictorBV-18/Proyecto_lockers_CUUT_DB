from fastapi import APIRouter

router = APIRouter()


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
from datetime import datetime

router = APIRouter()

class RegistroAcceso(BaseModel):
    id_guardia: int
    id_asignacion: int
    identidad_confirmada: bool
    vehiculo_coincide: bool

@router.get("/guardia/verificar/{qr_token}", tags=["Guardia"], summary="Escanear código QR y obtener datos del alumno asi como de los permisos")
def verificar_qr_acceso(qr_token: str):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")
        
    try:
        cursor = conexion.cursor()
        
        query = """
            SELECT 
                c.estado as estado_documento, 
                c.vigencia,
                s.tipo_tramite,
                a.nombre, 
                a.apellidos, 
                a.numero_cuenta, 
                a.carrera,
                v.placas, 
                v.modelo, 
                v.color,
                c.id_asignacion
            FROM constancia c
            JOIN asignacion asg ON c.id_asignacion = asg.id_asignacion
            JOIN solicitud s ON asg.id_solicitud = s.id_solicitud
            JOIN alumno a ON s.id_alumno = a.id_alumno
            LEFT JOIN vehiculo_solicitud v ON s.id_solicitud = v.id_solicitud
            WHERE c.qr_token = %s::uuid;
        """
        cursor.execute(query, (qr_token,))
        resultado = cursor.fetchone()
        
        cursor.close()
        conexion.close()
        
        if not resultado:
            raise HTTPException(status_code=404, detail="Código QR inválido o no encontrado en el sistema.")
            
        estado_doc = resultado[0]
        vigencia = resultado[1]
        
        if datetime.now().date() > vigencia and estado_doc == 'VIGENTE':
            estado_doc = 'VENCIDO'
            
        respuesta = {
            "estado_acceso": estado_doc,
            "id_asignacion": resultado[10],
            "tipo_tramite": resultado[2].upper(),
            "alumno": {
                "nombre_completo": f"{resultado[3]} {resultado[4]}",
                "numero_cuenta": resultado[5],
                "carrera": resultado[6]
            },
            "vehiculo": None
        }
        
        if resultado[2].lower() == 'estacionamiento' and resultado[7]:
            respuesta["vehiculo"] = {
                "placas": resultado[7],
                "modelo": resultado[8],
                "color": resultado[9]
            }
            
        return respuesta

    except ValueError:
        raise HTTPException(status_code=400, detail="El formato del código QR es incorrecto.")
    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")



@router.post("/guardia/registrar-acceso", tags=["Guardia"], summary="Registrar entrada validada por el guardia en caso de coincidir los datos y la vigencia, en caso de no, se rechaza la entrada y se registra para su auditoria")
def registrar_auditoria_acceso(datos: RegistroAcceso):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")
        
    try:
        cursor = conexion.cursor()
        
        cursor.execute("""
            INSERT INTO auditoria_acceso (id_guardia, id_asignacion, identidad_confirmada, vehiculo_coincide)
            VALUES (%s, %s, %s, %s) RETURNING id_acceso;
        """, (datos.id_guardia, datos.id_asignacion, datos.identidad_confirmada, datos.vehiculo_coincide))
        
        id_acceso = cursor.fetchone()[0]
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        if not datos.vehiculo_coincide or not datos.identidad_confirmada:
            return {"mensaje": "Acceso denegado registrado en bitácora.", "alerta": True, "id_acceso": id_acceso}
            
        return {"mensaje": "Acceso autorizado y registrado correctamente.", "alerta": False, "id_acceso": id_acceso}

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")