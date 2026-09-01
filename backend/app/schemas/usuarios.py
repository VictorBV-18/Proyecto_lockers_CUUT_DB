from pydantic import BaseModel, EmailStr, validator
from typing import Optional

CARRERAS_VALIDAS = [
    "Licenciatura en Ingeniería en Computación",
    "Licenciatura en Ingeniería en Software",
    "Licenciatura en Ingeniería en Producción Industrial",
    "Licenciatura en Ingeniería en Mecánica",
    "Licenciatura en Seguridad Ciudadana",
    "Licenciatura en Ingeniería en Ciberseguridad",
    "Licenciatura en Ingeniería en Plásticos"
]

ROLES_VALIDOS = ["ADMIN", "REVISOR", "VIGILANTE"]

class AlumnoCrear(BaseModel):
    numero_cuenta: str
    nombre: str
    apellidos: str
    carrera: str
    correo_electronico: EmailStr

    @validator('carrera')
    def validar_carrera(cls, v):
        carreras_lower = [c.lower() for c in CARRERAS_VALIDAS]
        if v.lower() not in carreras_lower:
            raise ValueError(f'Carrera no válida. Debe ser una de: {", ".join(CARRERAS_VALIDAS)}')
        idx = carreras_lower.index(v.lower())
        return CARRERAS_VALIDAS[idx]

    @validator('correo_electronico')
    def validar_correo_alumno(cls, v):
        if not (v.endswith('@alumno.uaemex.mx') or v.endswith('@uaemex.mx')):
            raise ValueError('El correo del alumno debe ser institucional (@alumno.uaemex.mx o @uaemex.mx)')
        return v

class PersonalCrear(BaseModel):
    numero_cuenta: str
    nombre: str
    apellidos: str
    contrasena: str
    rol: str
    correo_electronico: Optional[EmailStr] = None 

    @validator('rol')
    def validar_rol(cls, v):
        rol_upper = v.upper()
        if rol_upper not in ROLES_VALIDOS:
            raise ValueError(f'Rol no válido. Debe ser uno de: {", ".join(ROLES_VALIDOS)}')
        return rol_upper

    @validator('correo_electronico')
    def validar_correo_personal(cls, v):
        if v is None:
            return v
        if not (v.endswith('@profesor.uaemex.mx') or v.endswith('@uaemex.mx') or v.endswith('@cuut.mx')):
            raise ValueError('El correo del personal debe ser institucional')
        return v
        
class LoginRequest(BaseModel):
    numero_cuenta: str
    contrasena: str