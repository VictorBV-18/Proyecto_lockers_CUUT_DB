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
## endpint DISPONIBILIDAD DE LOCKERS
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

        # Validar que no exista otro locker con el mismo código
        cursor.execute("""
            SELECT id_locker
            FROM locker
            WHERE codigo_locker = %s;
        """, (datos.codigo_locker,))

        locker_existente = cursor.fetchone()

        if locker_existente:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Ya existe un locker con ese código.")

        # Crear locker
        cursor.execute("""
            INSERT INTO locker (codigo_locker, ubicacion, estado)
            VALUES (%s, %s, %s)
            RETURNING id_locker;
        """, (
            datos.codigo_locker,
            datos.ubicacion,
            datos.estado.value
        ))

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

        # Validar que el locker exista
        cursor.execute("""
            SELECT id_locker
            FROM locker
            WHERE id_locker = %s;
        """, (id_locker,))

        locker_existente = cursor.fetchone()

        if not locker_existente:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        # Validar que no exista otro locker con el mismo código
        cursor.execute("""
            SELECT id_locker
            FROM locker
            WHERE codigo_locker = %s AND id_locker <> %s;
        """, (datos.codigo_locker, id_locker))

        codigo_repetido = cursor.fetchone()

        if codigo_repetido:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Ya existe otro locker con ese código.")

        cursor.execute("""
            UPDATE locker
            SET codigo_locker = %s,
                ubicacion = %s,
                estado = %s
            WHERE id_locker = %s;
        """, (
            datos.codigo_locker,
            datos.ubicacion,
            datos.estado.value,
            id_locker
        ))

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

        # Validar que el locker exista
        cursor.execute("""
            SELECT id_locker, codigo_locker, ubicacion, estado
            FROM locker
            WHERE id_locker = %s;
        """, (id_locker,))

        locker = cursor.fetchone()

        if not locker:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        estado_actual = locker[3]

        if estado_actual == "OCUPADO":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede dar de baja un locker ocupado.")

        # Cambiar estado a mantenimiento
        cursor.execute("""
            UPDATE locker
            SET estado = 'MANTENIMIENTO'
            WHERE id_locker = %s;
        """, (id_locker,))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Locker dado de baja lógica correctamente.",
            "id_locker": id_locker,
            "codigo_locker": locker[1],
            "ubicacion": locker[2],
            "estado_anterior": estado_actual,
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

@router.post("/solicitudes/{id_solicitud}/aprobar-locker", tags=["Inventario"], summary="Aprobar solicitud de locker y asignar locker")
def aprobar_solicitud_locker(id_solicitud: int, datos: AprobarLocker):
    conexion = conectar_base()

    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()

        # 1. Validar que la solicitud exista
        cursor.execute("""
            SELECT s.id_solicitud, s.estado, s.tipo_tramite, a.numero_cuenta
            FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE s.id_solicitud = %s;
        """, (id_solicitud,))

        solicitud = cursor.fetchone()

        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        estado_actual = solicitud[1]
        tipo_tramite = solicitud[2]
        numero_cuenta = solicitud[3]

        # 2. Validar que sea trámite de locker
        if tipo_tramite.lower() != "locker":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud no es de tipo locker.")

        # 3. Validar que esté pendiente
        if estado_actual != "PENDIENTE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"La solicitud no se puede aprobar porque está en estado {estado_actual}.")

        # 4. Validar que todos los documentos estén aprobados
        cursor.execute("""
            SELECT COUNT(*)
            FROM documentos_solicitud
            WHERE id_solicitud = %s
            AND estado != 'APROBADO';
        """, (id_solicitud,))

        documentos_no_aprobados = cursor.fetchone()[0]

        if documentos_no_aprobados > 0:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede aprobar la solicitud porque aún hay documentos sin aprobar.")

        # 5. Validar que el locker exista y esté disponible
        cursor.execute("""
            SELECT id_locker, codigo_locker, ubicacion, estado
            FROM locker
            WHERE id_locker = %s;
        """, (datos.id_locker,))

        locker = cursor.fetchone()

        if not locker:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        estado_locker = locker[3]

        if estado_locker != "DISPONIBLE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"El locker no está disponible. Estado actual: {estado_locker}.")

        # 6. Actualizar solicitud a APROBADA
        cursor.execute("""
            UPDATE solicitud
            SET estado = 'APROBADA',
                revisado_por = %s,
                fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s;
        """, (datos.id_admin, id_solicitud))

        # 7. Crear asignación
        cursor.execute("""
            INSERT INTO asignacion (id_solicitud, id_locker, estado)
            VALUES (%s, %s, 'ACTIVA')
            RETURNING id_asignacion;
        """, (id_solicitud, datos.id_locker))

        id_asignacion = cursor.fetchone()[0]

        # 8. Cambiar locker a OCUPADO
        cursor.execute("""
            UPDATE locker
            SET estado = 'OCUPADO'
            WHERE id_locker = %s;
        """, (datos.id_locker,))

        # 9. Registrar historial
        cursor.execute("""
            INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario)
            VALUES (%s, %s, %s, %s, %s);
        """, (
            id_solicitud,
            estado_actual,
            "APROBADA",
            datos.id_admin,
            datos.comentario
        ))

        # 10. Crear notificación para alumno
        cursor.execute("""
            INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje)
            VALUES (%s, 'ALUMNO', 'Solicitud de locker aprobada', %s);
        """, (
            numero_cuenta,
            f"Tu solicitud de locker fue aprobada. Se te asignó el locker {locker[1]} ubicado en {locker[2]}."
        ))

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

        # 1. Validar que la solicitud exista
        cursor.execute("""
            SELECT s.id_solicitud, s.estado, s.tipo_tramite, a.numero_cuenta
            FROM solicitud s
            JOIN alumno a ON s.id_alumno = a.id_alumno
            WHERE s.id_solicitud = %s;
        """, (id_solicitud,))

        solicitud = cursor.fetchone()

        if not solicitud:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        estado_actual = solicitud[1]
        tipo_tramite = solicitud[2]
        numero_cuenta = solicitud[3]

        # 2. Validar que sea trámite de estacionamiento
        if tipo_tramite.lower() != "estacionamiento":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="Esta solicitud no es de tipo estacionamiento.")

        # 3. Validar que esté pendiente
        if estado_actual != "PENDIENTE":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"La solicitud no se puede aprobar porque está en estado {estado_actual}.")

        # 4. Validar que todos los documentos estén aprobados
        cursor.execute("""
            SELECT COUNT(*)
            FROM documentos_solicitud
            WHERE id_solicitud = %s
            AND estado != 'APROBADO';
        """, (id_solicitud,))

        documentos_no_aprobados = cursor.fetchone()[0]

        if documentos_no_aprobados > 0:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail="No se puede aprobar la solicitud porque aún hay documentos sin aprobar.")

        # 5. Actualizar solicitud a APROBADA
        cursor.execute("""
            UPDATE solicitud
            SET estado = 'APROBADA',
                revisado_por = %s,
                fecha_revision = CURRENT_TIMESTAMP
            WHERE id_solicitud = %s;
        """, (datos.id_admin, id_solicitud))

        # 6. Crear asignación sin locker
        cursor.execute("""
            INSERT INTO asignacion (id_solicitud, id_locker, estado)
            VALUES (%s, NULL, 'ACTIVA')
            RETURNING id_asignacion;
        """, (id_solicitud,))

        id_asignacion = cursor.fetchone()[0]

        # 7. Registrar historial
        cursor.execute("""
            INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo, id_admin, comentario)
            VALUES (%s, %s, %s, %s, %s);
        """, (
            id_solicitud,
            estado_actual,
            "APROBADA",
            datos.id_admin,
            datos.comentario
        ))

        # 8. Crear notificación para alumno
        cursor.execute("""
            INSERT INTO notificaciones (numero_cuenta, rol_destino, titulo, mensaje)
            VALUES (%s, 'ALUMNO', 'Solicitud de estacionamiento aprobada', %s);
        """, (
            numero_cuenta,
            "Tu solicitud de estacionamiento fue aprobada correctamente."
        ))

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