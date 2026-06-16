from fastapi import APIRouter, HTTPException
from app.db.conexion import conectar_base

router = APIRouter()

# Endpoint Login autenticacion de usuario
@router.post("/login/", tags=["Autenticación"], summary="Inicio de sesión")
def iniciar_sesion(numero_cuenta: str):
    conexion = conectar_base()
    
    if conexion is None:
        raise HTTPException(status_code=500, detail="Hubo un problema conectando a la base de datos")
        
    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT nombre, apellidos FROM alumno WHERE numero_cuenta = %s", (numero_cuenta,))
        alumno = cursor.fetchone()
        
        cursor.close()
        conexion.close()
        
        if alumno:
            return {
                "mensaje": f"Bienvenido, {alumno[0]} {alumno[1]}",
                "rol": "alumno"
            }
        else:
            raise HTTPException(status_code=404, detail="Este número de cuenta no existe")
            
    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.close()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")