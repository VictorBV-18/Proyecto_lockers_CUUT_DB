from fastapi import APIRouter, HTTPException
from app.db.conexion import conectar_base

router = APIRouter()






@router.get("/notificaciones/{numero_cuenta}", tags=["Notificaciones"], summary="Obtener notificaciones por cuenta o rol")
def obtener_notificaciones(numero_cuenta: str, rol: str = "ALUMNO"):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
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