from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.conexion import conectar_base
import math

router = APIRouter()

class MarcarLeida(BaseModel):
    numero_cuenta: str 

@router.get("/notificaciones/{numero_cuenta}", tags=["Notificaciones"], summary="Obtener notificaciones por cuenta o rol (Paginadas de 20 en 20)")
def obtener_notificaciones(numero_cuenta: str, rol: str = "ALUMNO", page: int = 1):
    registros_por_pagina = 20
    offset = (page - 1) * registros_por_pagina

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        query_count = """
            SELECT COUNT(*) 
            FROM notificaciones
            WHERE numero_cuenta = %s OR (rol_destino = %s AND numero_cuenta IS NULL)
        """
        cursor.execute(query_count, (numero_cuenta, rol.upper()))
        total_registros = cursor.fetchone()[0]

        query_datos = """
            SELECT id_notificacion, titulo, mensaje, leida, fecha_creacion
            FROM notificaciones
            WHERE numero_cuenta = %s OR (rol_destino = %s AND numero_cuenta IS NULL)
            ORDER BY fecha_creacion DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query_datos, (numero_cuenta, rol.upper(), registros_por_pagina, offset))
        
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

        total_paginas = math.ceil(total_registros / registros_por_pagina) if total_registros > 0 else 1

        return {
            "pagina_actual": page,
            "registros_por_pagina": registros_por_pagina,
            "total_registros": total_registros,
            "total_paginas": total_paginas,
            "resultados": notificaciones
        }

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


@router.get("/notificaciones/{numero_cuenta}/no-leidas", tags=["Notificaciones"], summary="Obtener el contador de notificaciones pendientes (se puede implementar para poner el numero en una campanita)")
def contar_notificaciones_no_leidas(numero_cuenta: str, rol: str = "ALUMNO"):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            SELECT COUNT(*) 
            FROM notificaciones 
            WHERE (numero_cuenta = %s OR (rol_destino = %s AND numero_cuenta IS NULL)) 
              AND leida = FALSE
        """, (numero_cuenta, rol.upper()))
        
        total_no_leidas = cursor.fetchone()[0]
        
        cursor.close()
        conexion.close()
        
        return {"no_leidas": total_no_leidas}

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


@router.put("/notificaciones/{id_notificacion}/leer", tags=["Notificaciones"], summary="Marcar una notificación individual como leída")
def marcar_notificacion_leida(id_notificacion: int, datos: MarcarLeida):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            UPDATE notificaciones 
            SET leida = TRUE 
            WHERE id_notificacion = %s AND (numero_cuenta = %s OR numero_cuenta IS NULL)
            RETURNING id_notificacion
        """, (id_notificacion, datos.numero_cuenta))
        
        resultado = cursor.fetchone()
        
        if not resultado:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=403, detail="Notificación no encontrada o no tienes permiso para modificarla.")
            
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": "Notificación marcada como leída"}

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


@router.put("/notificaciones/{numero_cuenta}/leer-todas", tags=["Notificaciones"], summary="Marcar todas las notificaciones de un usuario como leídas")
def marcar_todas_notificaciones_leidas(numero_cuenta: str, rol: str = "ALUMNO"):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            UPDATE notificaciones 
            SET leida = TRUE 
            WHERE (numero_cuenta = %s OR (rol_destino = %s AND numero_cuenta IS NULL)) 
              AND leida = FALSE
        """, (numero_cuenta, rol.upper()))
        
        filas_actualizadas = cursor.rowcount
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {"mensaje": f"Se han marcado {filas_actualizadas} notificaciones como leídas."}

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")