
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Alumno(Base):
    __tablename__ = "alumno"

    id_alumno = Column(Integer, primary_key=True, index=True)
    numero_cuenta = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(80), nullable=False)
    apellidos = Column(String(120), nullable=False)
    carrera_abreviatura = Column(String(10), nullable=False)
