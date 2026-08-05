from fastapi import APIRouter, HTTPException
from app.db.conexion import conectar_base
from app.schemas.usuarios import LoginRequest
from app.utils.seguridad import verificar_contrasena

router = APIRouter()

@router.post("/login/", tags=["Autenticación"], summary="Inicio de sesión seguro con contraseña encriptada")
def iniciar_sesion(datos: LoginRequest):
    conexion = conectar_base()
    
    if conexion is None:
        raise HTTPException(status_code=500, detail="Hubo un problema conectando a la base de datos")
        
    try:
        cursor = conexion.cursor()
        

        cursor.execute("""
            SELECT id_alumno, nombre, apellidos, correo_electronico, contrasena_hash, estado_activo 
            FROM alumno WHERE numero_cuenta = %s
        """, (datos.numero_cuenta,))
        alumno = cursor.fetchone()
        
        if alumno:
            if not alumno[5]: 
                raise HTTPException(status_code=403, detail="Esta cuenta de alumno ha sido deshabilitada.")
            
            if not verificar_contrasena(datos.contrasena, alumno[4]):
                raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

            return {
                "mensaje": f"Bienvenido, {alumno[1]} {alumno[2]}",
                "rol": "alumno",
                "datos_usuario": {
                    "id": alumno[0],
                    "nombre_completo": f"{alumno[1]} {alumno[2]}",
                    "numero_cuenta": datos.numero_cuenta,
                    "correo": alumno[3]
                }
            }
            

        cursor.execute("""
            SELECT id_admin, nombre, apellidos, rol, correo_electronico, contrasena_hash, estado_activo 
            FROM admin WHERE numero_cuenta = %s
        """, (datos.numero_cuenta,))
        personal = cursor.fetchone()

        if personal:

            if not personal[6]:
                raise HTTPException(status_code=403, detail="Esta cuenta de personal ha sido deshabilitada.")
            
            if not verificar_contrasena(datos.contrasena, personal[5]):
                raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

            return {
                "mensaje": f"Bienvenido(a), {personal[1]} {personal[2]}",
                "rol": personal[3].lower(),
                "datos_usuario": {
                    "id": personal[0],
                    "nombre_completo": f"{personal[1]} {personal[2]}",
                    "numero_cuenta": datos.numero_cuenta,
                    "correo": personal[4]
                }
            }
            
        raise HTTPException(status_code=404, detail="Este número de cuenta no existe en el sistema.")
            
    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    finally:
        if conexion:
            cursor.close()
            conexion.close()