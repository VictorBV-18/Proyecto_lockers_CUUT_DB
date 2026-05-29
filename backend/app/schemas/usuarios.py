# schemas/usuarios.py
from pydantic import BaseModel

# revisa que los datos vengan correctos al registrar un alumno
class AlumnoCrear(BaseModel):
    numero_cuenta: str
    nombre: str
    apellidos: str
    carrera_abreviatura: str

# decide que informacion es segura enviar de regreso a la pagina web
# ocultamos el id_alumno 
class AlumnoRespuesta(BaseModel):
    numero_cuenta: str
    nombre: str
    apellidos: str
    carrera_abreviatura: str

    class Config:
        orm_mode = True
        