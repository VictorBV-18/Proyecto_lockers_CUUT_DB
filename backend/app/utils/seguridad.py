import bcrypt

# Contraseña encriptada
def obtener_hash_contrasena(contrasena: str) -> str:
    """Recibe una contraseña plana y devuelve su hash bcrypt como string."""
    bytes_contrasena = contrasena.encode('utf-8')
    sal = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(bytes_contrasena, sal)
    return hash_bytes.decode('utf-8')

def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
    """Verifica si la contraseña ingresada coincide con el hash."""
    bytes_contrasena = contrasena_plana.encode('utf-8')
    bytes_hash = contrasena_hasheada.encode('utf-8')
    return bcrypt.checkpw(bytes_contrasena, bytes_hash)