from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.rutas_login import router as rutas_login

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

@app.get("/")
def ruta_de_prueba():
    return {"mensaje": "hola el servidor del proyecto cuut esta funcionando"}