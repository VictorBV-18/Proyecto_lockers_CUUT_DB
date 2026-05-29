from fastapi import APIRouter
from app.db.conexion import conectar_base

# creamos un enrutador que es como un mini main para agrupar estas rutas
router = APIRouter()

@router.post("/login/")
def iniciar_sesion(numero_cuenta: str):
    conexion = conectar_base()
    
    if conexion is None:
        return {"mensaje": "hubo un problema conectando a la base de datos"}
        
    cursor = conexion.cursor()
    cursor.execute("SELECT nombre, apellidos FROM alumno WHERE numero_cuenta = %s", (numero_cuenta,))
    alumno = cursor.fetchone()
    
    cursor.close()
    conexion.close()
    
    if alumno:
        return {
            "mensaje": "bienvenido " + alumno[0],
            "rol": "alumno"
        }
    else:
        return {
            "mensaje": "este numero de cuenta no existe"
        }