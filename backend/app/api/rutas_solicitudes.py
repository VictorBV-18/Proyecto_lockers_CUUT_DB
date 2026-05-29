# cuando el alumno llene sus datos y los envie, esta parte se encargara de recibirla y revisar en la base de datos
# si el alumno ya tiene o no un locker asignado y guardar la nueva solicitud


from fastapi import APIRouter

router = APIRouter()

@router.post("/solicitar-locker/")
def solicitar_locker(numero_cuenta: str):
    return {"mensaje": "tu solicitud de locker se registro con exito"}

