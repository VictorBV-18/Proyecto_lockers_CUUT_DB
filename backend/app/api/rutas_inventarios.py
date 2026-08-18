from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum
from app.db.conexion import conectar_base
import os
from app.utils.notificaciones import enviar_correo_vencimiento_agrupado

router = APIRouter()
CARPETA_UPLOADS = "uploads"

class LiberacionMasiva(BaseModel):
    id_admin: int
    motivo: str = "Fin de ciclo escolar"

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

@router.post("/admin/inventario/liberacion-masiva", tags=["Inventario"], summary="Cierre semestral total, Vence todas las solicitudes, libera lockers, borra todos los archivos de uploads y envia notificaciones por correo de alumnos")
def liberacion_masiva_fin_semestre(datos: LiberacionMasiva):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        
        cursor.execute("""
            SELECT al.id_alumno, al.correo_electronico, al.nombre, al.apellidos, s.tipo_tramite, c.documento_path
            FROM asignacion a
            JOIN solicitud s ON a.id_solicitud = s.id_solicitud
            JOIN constancia c ON a.id_asignacion = c.id_asignacion
            JOIN alumno al ON s.id_alumno = al.id_alumno
            WHERE a.estado IN ('ACTIVA', 'BLOQUEADA');
        """)
        permisos_activos = cursor.fetchall()
        
        alumnos_agrupados = {}
        pdfs_a_borrar = []
        
        for p in permisos_activos:
            id_al, correo, nombre, apellidos, tramite, archivo = p
            pdfs_a_borrar.append(archivo)
            
            if id_al not in alumnos_agrupados:
                alumnos_agrupados[id_al] = {
                    "correo": correo,
                    "nombre_completo": f"{nombre} {apellidos}",
                    "tiene_locker": False,
                    "tiene_estacionamiento": False
                }
            if tramite.lower() == 'locker':
                alumnos_agrupados[id_al]["tiene_locker"] = True
            elif tramite.lower() == 'estacionamiento':
                alumnos_agrupados[id_al]["tiene_estacionamiento"] = True

        for archivo in pdfs_a_borrar:
            if archivo:
                ruta = os.path.join(CARPETA_UPLOADS, archivo)
                if os.path.exists(ruta):
                    os.remove(ruta)

        for data in alumnos_agrupados.values():
            enviar_correo_vencimiento_agrupado(
                data["correo"], 
                data["nombre_completo"], 
                data["tiene_locker"], 
                data["tiene_estacionamiento"]
            )

        cursor.execute("SELECT evidencia_path FROM auditoria_acceso WHERE evidencia_path IS NOT NULL;")
        evidencias_guardia = cursor.fetchall()
        for evidencia in evidencias_guardia:
            ruta = os.path.join(CARPETA_UPLOADS, evidencia[0])
            if os.path.exists(ruta):
                os.remove(ruta)
                
        cursor.execute("UPDATE auditoria_acceso SET evidencia_path = 'eliminado_fin_semestre' WHERE evidencia_path IS NOT NULL;")

        cursor.execute("SELECT archivo_path FROM documentos_solicitud WHERE archivo_path IS NOT NULL AND archivo_path != 'eliminado_fin_semestre';")
        documentos_alumnos = cursor.fetchall()
        for doc in documentos_alumnos:
            ruta = os.path.join(CARPETA_UPLOADS, doc[0])
            if os.path.exists(ruta):
                os.remove(ruta)
                
        cursor.execute("UPDATE documentos_solicitud SET archivo_path = 'eliminado_fin_semestre', estado = 'VENCIDO' WHERE archivo_path IS NOT NULL;")

        cursor.execute("UPDATE constancia SET estado = 'VENCIDO', documento_path = 'eliminado_fin_semestre' WHERE estado != 'VENCIDO';")
        cursor.execute("UPDATE asignacion SET estado = 'FINALIZADA' WHERE estado IN ('ACTIVA', 'BLOQUEADA');")
        
        cursor.execute("UPDATE solicitud SET estado = 'VENCIDA' WHERE estado != 'VENCIDA';")
        
        cursor.execute("UPDATE locker SET estado = 'DISPONIBLE' WHERE estado = 'OCUPADO';")
        lockers_liberados = cursor.rowcount
        
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return {
            "mensaje": "Cierre de semestre ejecutado con éxito. Se enviaron correos agrupados y se borraron todos los archivos.",
            "alumnos_notificados": len(alumnos_agrupados),
            "lockers_liberados": lockers_liberados,
            "fotos_guardia_borradas": len(evidencias_guardia),
            "documentos_alumno_borrados": len(documentos_alumnos)
        }

    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")

@router.patch("/admin/lockers/{id_locker}/alta", tags=["Inventario"], summary="Dar de alta un locker que estaba en mantenimiento")
def dar_alta_locker(id_locker: int, id_admin: int):
    conexion = conectar_base()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error de conexión a la BD")

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT codigo_locker, ubicacion, estado FROM locker WHERE id_locker = %s;", (id_locker,))
        locker = cursor.fetchone()

        if not locker:
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=404, detail="Locker no encontrado.")

        if locker[2] != "MANTENIMIENTO":
            cursor.close()
            conexion.close()
            raise HTTPException(status_code=400, detail=f"El locker está {locker[2]}. Solo se pueden dar de alta lockers en MANTENIMIENTO.")

        cursor.execute("UPDATE locker SET estado = 'DISPONIBLE' WHERE id_locker = %s;", (id_locker,))

        conexion.commit()
        cursor.close()
        conexion.close()

        return {
            "mensaje": "Locker dado de alta exitosamente. Ahora está disponible.",
            "id_locker": id_locker,
            "codigo_locker": locker[0],
            "ubicacion": locker[1],
            "estado_anterior": "MANTENIMIENTO",
            "estado_nuevo": "DISPONIBLE"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")