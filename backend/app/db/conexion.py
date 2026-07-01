import psycopg2

# atajo para abrir la conexion a la base de datos
def conectar_base():
    try:
        conexion = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password="141601",
            client_encoding="utf8"
        )
        return conexion
    except Exception as error_real:
        print(f"error real de la base de datos: {error_real}")
        return None