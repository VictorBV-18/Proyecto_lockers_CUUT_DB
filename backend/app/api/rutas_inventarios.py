from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum
from app.db.conexion import conectar_base

router = APIRouter()

class EstadoLocker(str, Enum):
    DISPONIBLE = "DISPONIBLE"
    OCUPADO = "OCUPADO"
    MANTENIMIENTO = "MANTENIMIENTO"

class CrearLocker(BaseModel):
    codigo_locker: str
    ubicacion: str
    estado: EstadoLocker = EstadoLocker.DISPONIBLE

class ActualizarLocker(BaseModel):
    codigo_locker: str
    ubicacion: str
    estado: EstadoLocker

class BajaLocker(BaseModel):
    id_admin: int
    motivo: str

class AprobarLocker(BaseModel):
    id_admin: int
    id_locker: int
    comentario: str | None = "Solicitud aprobada y locker asignado."

class AprobarEstacionamiento(BaseModel):
    id_admin: int
    comentario: str | None = "Solicitud de estacionamiento aprobada."


############################################
## endpoint DISPONIBILIDAD DE LOCKERS
############################################
@router.get("/inventario/lockers", tags=["Inventario"], summary="Consultar inventario general de lockers")
def consultar_inventario_lockers():
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_lockers,
                COUNT(*) FILTER (WHERE estado = 'DISPONIBLE') AS disponibles,
                COUNT(*) FILTER (WHERE estado = 'OCUPADO') AS ocupados,
                COUNT(*) FILTER (WHERE estado = 'MANTENIMIENTO') AS mantenimiento
            FROM locker;
        """)
        resumen = cursor.fetchone()

        total_lockers = resumen[0]
        disponibles = resumen[1]
        ocupados = resumen[2]
        mantenimiento = resumen[3]

        if total_lockers > 0:
            porcentaje_disponible = round((disponibles / total_lockers) * 100, 2)
        else:
            porcentaje_disponible = 0

        alerta_baja_disponibilidad = porcentaje_disponible < 10

        cursor.execute("""
            SELECT id_locker, codigo_locker, ubicacion, estado
            FROM locker
            WHERE estado = 'DISPONIBLE'
            ORDER BY id_locker;
        """)
        filas = cursor.fetchall()
        lockers_disponibles = []

        for fila in filas:
            lockers_disponibles.append({
                "id_locker": fila[0],
                "codigo_locker": fila[1],
                "ubicacion": fila[2],
                "estado": fila[3]
            })

        cursor.close()
        conexion.close()

        return {
            "total_lockers": total_lockers,
            "disponibles": disponibles,
            "ocupados": ocupados,
            "mantenimiento": mantenimiento,
            "porcentaje_disponible": porcentaje_disponible,
            "alerta_baja_disponibilidad": alerta_baja_disponibilidad,
            "lockers_disponibles": lockers_disponibles
        }

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    

############################################
## endpoint administrador de lockers.
############################################
@router.get("/admin/lockers", tags=["Inventario"], summary="Listar todos los lockers para administrador")
def listar_todos_los_lockers():
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("""
            SELECT id_locker, codigo_locker, ubicacion, estado
            FROM locker
            ORDER BY id_locker;
        """)
        filas = cursor.fetchall()
        lockers = []

        for fila in filas:
            lockers.append({
                "id_locker": fila[0],
                "codigo_locker": fila[1],
                "ubicacion": fila[2],
                "estado": fila[3]
            })

        cursor.close()
        conexion.close()
        return {"lockers": lockers}

    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    

############################################
## endpoint creación de lockers nuevos.
############################################
@router.post("/admin/lockers", tags=["Inventario"], summary="Crear un nuevo locker")
def crear_locker(datos: CrearLocker):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT id_locker FROM locker WHERE codigo_locker = %s;", (datos.codigo_locker,))

        if cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Ya existe un locker con ese código.")

        cursor.execute("""
            INSERT INTO locker (codigo_locker, ubicacion, estado)
            VALUES (%s, %s, %s)
            RETURNING id_locker;
        """, (datos.codigo_locker, datos.ubicacion, datos.estado.value))

        id_locker = cursor.fetchone()[0]
        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Locker creado correctamente.",
            "id_locker": id_locker,
            "codigo_locker": datos.codigo_locker,
            "ubicacion": datos.ubicacion,
            "estado": datos.estado.value
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


############################################
## endpoint Actualizar estado lockers 
############################################
@router.put("/admin/lockers/{id_locker}", tags=["Inventario"], summary="Actualizar información de un locker")
def actualizar_locker(id_locker: int, datos: ActualizarLocker):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT id_locker FROM locker WHERE id_locker = %s;", (id_locker,))
        if not cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        cursor.execute("""
            SELECT id_locker FROM locker WHERE codigo_locker = %s AND id_locker <> %s;
        """, (datos.codigo_locker, id_locker))
        
        if cursor.fetchone():
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Ya existe otro locker con ese código.")

        cursor.execute("""
            UPDATE locker
            SET codigo_locker = %s, ubicacion = %s, estado = %s
            WHERE id_locker = %s;
        """, (datos.codigo_locker, datos.ubicacion, datos.estado.value, id_locker))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Locker actualizado correctamente.",
            "id_locker": id_locker,
            "codigo_locker": datos.codigo_locker,
            "ubicacion": datos.ubicacion,
            "estado": datos.estado.value
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


############################################
## endpoint dar de baja un locker
############################################
@router.patch("/admin/lockers/{id_locker}/baja", tags=["Inventario"], summary="Dar de baja lógica un locker")
def dar_baja_locker(id_locker: int, datos: BajaLocker):
    if not datos.motivo or datos.motivo.strip() == "":
        raise HTTPException(status_code=400, detail="El motivo de baja es obligatorio.")

    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT id_locker, codigo_locker, ubicacion, estado FROM locker WHERE id_locker = %s;", (id_locker,))
        locker = cursor.fetchone()

        if not locker:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        if locker[3] == "OCUPADO":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede dar de baja un locker ocupado.")

        cursor.execute("UPDATE locker SET estado = 'MANTENIMIENTO' WHERE id_locker = %s;", (id_locker,))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Locker dado de baja lógica correctamente.",
            "id_locker": id_locker,
            "codigo_locker": locker[1],
            "ubicacion": locker[2],
            "estado_anterior": locker[3],
            "estado_nuevo": "MANTENIMIENTO",
            "motivo": datos.motivo,
            "id_admin": datos.id_admin
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


############################################
## endpoint aprobar lockers
############################################
@router.post("/solicitudes/{id_solicitud}/aprobar-locker", tags=["Inventario"], summary="Aprobar solicitud de locker y asignar")
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


##########################################
## endpoint aprobar estacionamiento
##########################################
@router.post("/solicitudes/{id_solicitud}/aprobar-estacionamiento", tags=["Inventario"], summary="Aprobar solicitud de estacionamiento")
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