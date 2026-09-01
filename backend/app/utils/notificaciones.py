import os
import smtplib
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

# Obtener la ruta base absoluta del backend y cargar el archivo .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

# ==========================================
# CONFIGURACIÓN DE SERVIDORES SMTP
# ==========================================

# Credenciales de transporte SMTP (Gmail)
GMAIL_CORREO = os.getenv("GMAIL_CORREO")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
GMAIL_HOST = "smtp.gmail.com"
GMAIL_PORT = 587

# Remitente de trámites institucionales
OUTLOOK_CORREO = os.getenv("OUTLOOK_CORREO")


# ==========================================
# FUNCIONES DE ENVÍO DE CORREO
# ==========================================

def enviar_correo_rechazo(correo_destino: str, nombre_completo: str, tramite: str, motivo: str):
    """
    Envía una notificación de rechazo de documentos al alumno.
    """
    asunto = f"Actualización - Solicitud {tramite.capitalize()}"
    
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo},</b></p>

        <p>Tu solicitud para el trámite de <b>{tramite.lower()}</b> ha sido revisada por nuestro personal del plantel educativo.</p>
        
        <p><b>Estado actual de la solicitud:</b><br>
        Documentación Incorrecta.</p>

        <p><b>Motivo del rechazo:</b><br>
        {motivo}</p>

        <p>Por favor, ingresa al <b>sistema institucional</b> para corregir tu documentación lo antes posible.</p>

        <p><b>Atentamente<br>
        Administración CUUT</b></p>
    </body>
    </html>
    """

    mensaje = MIMEMultipart()
    mensaje['From'] = GMAIL_CORREO
    mensaje['To'] = correo_destino
    mensaje['Subject'] = asunto
    mensaje.attach(MIMEText(cuerpo_html, 'html'))

    try:
        servidor = smtplib.SMTP(GMAIL_HOST, GMAIL_PORT)
        servidor.starttls()
        servidor.login(GMAIL_CORREO, GMAIL_PASSWORD)
        servidor.sendmail(GMAIL_CORREO, correo_destino, mensaje.as_string())
        servidor.quit()
        print(f"ÉXITO: Correo de rechazo enviado a {correo_destino}")
        return True
    except Exception as e:
        print(f"ERROR: No se pudo enviar el correo a {correo_destino}. Detalle: {str(e)}")
        return False


def enviar_correo_documento(correo_destino: str, nombre_completo: str, tramite: str, nombre_archivo: str):
    """
    Envía un correo electrónico al alumno adjuntando su pase generado en PDF.
    """
    asunto = f"¡Tu documento de {tramite.capitalize()} está listo!"
    
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo},</b></p>
        <p>Nos complace informarte que tu solicitud para el trámite de <b>{tramite.lower()}</b> ha sido <b>APROBADA</b> y tu pase oficial ya fue generado.</p>
        <p>Encuentra adjunto a este correo tu documento oficial en formato PDF. El código QR incluido servirá para validar tu acceso con el personal de seguridad.</p>
        <p>También puedes descargar este documento en cualquier momento desde tu portal de alumno.</p>
        <p><b>Atentamente<br>
        Administración CUUT</b></p>
    </body>
    </html>
    """

    mensaje = MIMEMultipart()
    mensaje['From'] = GMAIL_CORREO
    mensaje['To'] = correo_destino
    mensaje['Subject'] = asunto
    mensaje.attach(MIMEText(cuerpo_html, 'html'))

    ruta_archivo = os.path.join("uploads", nombre_archivo)
    
    if os.path.exists(ruta_archivo):
        try:
            with open(ruta_archivo, "rb") as adjunto:
                parte_adjunta = MIMEBase('application', 'octet-stream')
                parte_adjunta.set_payload(adjunto.read())
                
            encoders.encode_base64(parte_adjunta)
            parte_adjunta.add_header(
                'Content-Disposition',
                f'attachment; filename={nombre_archivo}'
            )
            mensaje.attach(parte_adjunta)
        except Exception as e:
            print(f"Error al adjuntar el archivo: {e}")
    else:
        print(f"ADVERTENCIA: El archivo {nombre_archivo} no se encontró en la carpeta uploads.")

    try:
        servidor = smtplib.SMTP(GMAIL_HOST, GMAIL_PORT)
        servidor.starttls()
        servidor.login(GMAIL_CORREO, GMAIL_PASSWORD)
        servidor.sendmail(GMAIL_CORREO, correo_destino, mensaje.as_string())
        servidor.quit()
        print(f"ÉXITO: Correo con documento enviado a {correo_destino}")
        return True
    except Exception as e:
        print(f"ERROR: No se pudo enviar el correo a {correo_destino}. Detalle: {str(e)}")
        return False


def enviar_alerta_seguridad_guardia(correo_destino: str, titulo_alerta: str, mensaje_alerta: str):
    """
    Envía notificaciones y alertas de control de accesos del guardia de seguridad a través de Gmail.
    """
    asunto = f"Control de Seguridad CUUT - {titulo_alerta}"

    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <h3>Alerta de Control de Acceso y Vigilancia</h3>
        <p><b>Asunto:</b> {titulo_alerta}</p>
        <p>{mensaje_alerta}</p>
        <br>
        <p><b>Seguridad Institucional CUUT</b></p>
    </body>
    </html>
    """

    mensaje = MIMEMultipart()
    mensaje['From'] = GMAIL_CORREO
    mensaje['To'] = correo_destino
    mensaje['Subject'] = asunto
    mensaje.attach(MIMEText(cuerpo_html, 'html'))

    try:
        servidor = smtplib.SMTP(GMAIL_HOST, GMAIL_PORT)
        servidor.starttls()
        servidor.login(GMAIL_CORREO, GMAIL_PASSWORD)
        servidor.sendmail(GMAIL_CORREO, correo_destino, mensaje.as_string())
        servidor.quit()
        print(f"ÉXITO: Alerta enviada a guardia ({correo_destino}) vía Gmail")
        return True
    except Exception as e:
        print(f"ERROR: No se pudo enviar alerta de seguridad. Detalle: {str(e)}")
        return False