from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.rutas_login import router as rutas_login
from app.api.rutas_alumno import router as rutas_alumno
from app.api.rutas_administrador import router as rutas_administrador
from app.api.rutas_notificaciones import router as rutas_notificaciones
from app.api.rutas_guardia import router as rutas_guardia

# Se crea la aplicacion principal
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Para que el main pueda incluir rutas que separemos
app.include_router(rutas_login)
app.include_router(rutas_alumno)
app.include_router(rutas_administrador)
app.include_router(rutas_notificaciones)
app.include_router(rutas_guardia)

@app.get("/")
def ruta_de_prueba():
    return {"mensaje": "servidor activo y modularizado correctamente"}