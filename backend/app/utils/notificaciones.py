import os
import smtplib
import secrets
import string
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
# FUNCIONES DE UTILIDAD
# ==========================================

def generar_password_seguro(longitud=12):
    caracteres = string.ascii_letters + string.digits + "!@#$%&*"
    return ''.join(secrets.choice(caracteres) for _ in range(longitud))


# ==========================================
# FUNCIONES DE ENVÍO DE CORREO
# ==========================================

def enviar_correo_rechazo(correo_destino: str, nombre_completo: str, tramite: str, motivo: str):
    """
    Envía una notificación de rechazo de documentos al alumno.
    """
    asunto = f"Solicitud de {tramite.capitalize()} rechazada | Portal CUUT"
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo},</b></p>
        <p>Tu solicitud para el trámite de <b>{tramite.lower()}</b> ha sido revisada por nuestro personal del plantel educativo.</p>
        <p><b>Estado actual de la solicitud:</b><br>Solicitud Rechazada.</p>
        <p><b>Motivo del rechazo:</b><br>{motivo}</p>
        <p>Por favor, ingresa al <b>sistema institucional</b> para corregir tu documentación lo antes posible.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
    asunto = f"¡Tu permiso de {tramite.capitalize()} fue aprobado! | Portal CUUT"
    texto_extra = "al momento de ingresar al estacionamiento de la universidad." if tramite.lower() == 'estacionamiento' else "."
    
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo},</b></p>
        <p>Nos complace informarte que tu permiso para la solicitud de <b>{tramite.lower()}</b> ha sido <b>APROBADA</b> y tu documento oficial ya fue generado.</p>
        <p>Encuentra adjunto a este correo tu documento oficial en formato PDF. El código QR incluido servirá para validar tu acceso con el personal de seguridad {texto_extra}</p>
        <p>También puedes descargar este documento en cualquier momento desde tu portal de alumno.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
            parte_adjunta.add_header('Content-Disposition', f'attachment; filename={nombre_archivo}')
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


def enviar_correo_credenciales(correo_destino: str, nombre_completo: str, cuenta: str, contrasena: str, rol: str):
    """
    Envía credenciales de acceso iniciales al registrar un nuevo usuario.
    """
    asunto = "Bienvenido al Portal CUUT | Datos de acceso"
    if rol.lower() == "alumno":
        cuerpo_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <p>Hola <b>{nombre_completo}</b>,</p>
            <p>Tu cuenta ha sido creada exitosamente en el sistema institucional, puedes acceder sin ningún problema con tus credenciales.</p>
            <p><b>Número de cuenta:</b> {cuenta}<br>
            <b>Contraseña:</b> {contrasena}</p>
            <p>Por tu seguridad, te recomendamos iniciar sesión y cambiar tu contraseña en tu perfil directamente desde el sistema.</p>
            <p><b>Atentamente<br>Administración CUUT</b></p>
        </body>
        </html>
        """
    else:
        cuerpo_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <p>Hola <b>{nombre_completo}</b>,</p>
            <p>Tu cuenta como {rol} ha sido creada exitosamente en el sistema institucional.</p>
            <p><b>Número de cuenta:</b> {cuenta}<br>
            <b>Contraseña:</b> {contrasena}</p>
            <p><b>Atentamente<br>Administración CUUT</b></p>
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
        return True
    except Exception as e:
        print(f"ERROR al enviar credenciales: {e}")
        return False


def enviar_correo_rechazo_guardia(correo_destino: str, nombre_completo: str, motivo: str):
    """
    Notifica al alumno cuando el guardia le registra una incidencia de acceso.
    """
    asunto = "Portal CUUT | Acceso Denegado - Estacionamiento"
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo}</b>,</p>
        <p>El personal de seguridad ha registrado una incidencia y ha denegado tu acceso al estacionamiento el día de hoy.</p>
        <p><b>Motivo reportado:</b><br>{motivo}</p>
        <p>Te recordamos que acumular 3 reportes resultará en el bloqueo automático de tu permiso y se te negará el acceso al portal de alumno con tu cuenta institucional.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
        return True
    except Exception as e:
        print(f"ERROR al enviar notificación de guardia: {e}")
        return False


def enviar_correo_vencimiento_agrupado(correo_destino: str, nombre_completo: str, tiene_locker: bool, tiene_estacionamiento: bool):
    """
    Notifica el vencimiento de ciclo escolar agrupando trámites de estacionamiento y locker.
    """
    if tiene_locker and tiene_estacionamiento:
        tramite_texto = "estacionamiento y locker"
        tramite_titulo = "Estacionamiento y Locker"
        accion_texto = "acceder a las instalaciones u ocupar algún locker"
    elif tiene_estacionamiento:
        tramite_texto = "estacionamiento"
        tramite_titulo = "Estacionamiento"
        accion_texto = "acceder a las instalaciones vehiculares"
    else:
        tramite_texto = "locker"
        tramite_titulo = "Locker"
        accion_texto = "ocupar el locker asignado"

    asunto = f"Portal CUUT | Aviso de Vencimiento - Permiso de {tramite_titulo}"
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Estimado(a) <b>{nombre_completo}</b>,</p>
        <p>Te notificamos que el ciclo escolar correspondiente a tu permiso de <b>{tramite_texto}</b> ha concluido.</p>
        <p>Por lo tanto, tu documento oficial ha <b>VENCIDO</b> y ya no es válido para {accion_texto} en la institución.</p>
        <p>Si deseas seguir utilizando el permiso para el próximo semestre, por favor ingresa al portal institucional y realiza tu trámite de <b>Reposición</b> subiendo tu documentación actualizada.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
        return True
    except Exception as e:
        print(f"ERROR al enviar aviso de vencimiento: {e}")
        return False


def enviar_correo_bloqueo(correo_destino: str, nombre_completo: str):
    """
    Notifica el bloqueo temporal al acumular 3 reportes/strikes.
    """
    asunto = "⚠️ AVISO IMPORTANTE ⚠️ | Cuenta Bloqueada | Portal CUUT"
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Estimado(a) <b>{nombre_completo}</b>,</p>
        <p>Te notificamos que el personal de seguridad ha denegado tu acceso al estacionamiento en 3 ocasiones distintas por incumplimiento de normas institucionales.</p>
        <p>Como medida de seguridad, <b>tu cuenta ha sido bloqueada temporalmente</b> y tu permiso ha sido suspendido.</p>
        <p>Por favor, acude a la oficina de administración del plantel para revisar tu situación y apelar tu caso.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
        return True
    except Exception as e:
        print(f"ERROR al enviar correo de bloqueo: {e}")
        return False


def enviar_correo_desbloqueo(correo_destino: str, nombre_completo: str):
    """
    Notifica la reactivación de cuenta y permisos tras apelación aprobada.
    """
    asunto = "Portal CUUT | Cuenta Restaurada"
    cuerpo_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
        <p>Hola <b>{nombre_completo}</b>,</p>
        <p>Te notificamos que tu apelación ha sido aceptada y tu cuenta institucional junto con tus permisos han sido <b>reactivados</b>.</p>
        <p>Ya puedes ingresar nuevamente al portal y utilizar las instalaciones vehiculares de la universidad sin problemas.</p>
        <p><b>Atentamente<br>Administración CUUT</b></p>
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
        return True
    except Exception as e:
        print(f"ERROR al enviar correo de desbloqueo: {e}")
        return False


def enviar_alerta_seguridad_guardia(correo_destino: str, titulo_alerta: str, mensaje_alerta: str):
    """
    Envía notificaciones y alertas de control de accesos del personal de vigilancia.
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