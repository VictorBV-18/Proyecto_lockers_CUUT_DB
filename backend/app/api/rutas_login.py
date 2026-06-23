from fastapi import APIRouter, HTTPException
from app.db.conexion import conectar_base

router = APIRouter()

# Endpoint Login autenticacion de usuario conforme a su rol
@router.post("/login/", tags=["Autenticación"], summary="Inicio de sesión")
def iniciar_sesion(numero_cuenta: str):
    conexion = conectar_base()
    
    if conexion is None:
        raise HTTPException(status_code=500, detail="Hubo un problema conectando a la base de datos")
        
    try:
        cursor = conexion.cursor()
        
        # Se busca primero si es un alumno
        cursor.execute("SELECT nombre, apellidos FROM alumno WHERE numero_cuenta = %s", (numero_cuenta,))
        alumno = cursor.fetchone()
        
        if alumno:
            cursor.close()
            conexion.close()
            return {
                "mensaje": f"Bienvenido, {alumno[0]} {alumno[1]}",
                "rol": "alumno"
            }
            
        # Si no es alumno se busca en PERSONAL / ADMIN
        cursor.execute("SELECT nombre, apellidos, rol FROM admin WHERE numero_cuenta = %s", (numero_cuenta,))
        personal = cursor.fetchone()
        
        cursor.close()
        conexion.close()
        
        if personal:
            rol_personal = personal[2].lower() 
            return {
                "mensaje": f"Bienvenido(a), {personal[0]} {personal[1]}",
                "rol": rol_personal
            }
            
        # Si no se encuentra en ninguna tabla
        raise HTTPException(status_code=404, detail="Este número de cuenta no existe en el sistema.")
            
    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")