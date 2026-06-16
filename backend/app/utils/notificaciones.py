import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuracion SMTP por medio de GMAIL (PRUEBA)
CORREO_REMITENTE = "tramitesprueba375@gmail.com" 
CONTRASENA_APP = "uhbcsasrhxcoduvj"   

def enviar_correo_rechazo(correo_destino: str, nombre_completo: str, tramite: str, motivo: str):
    # Asunto dinammico, dependiendo de que tramite se este rechazando 
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

        <p><b>Atentamente...<br>
        Administración CUUT</b></p>
    </body>
    </html>
    """

    mensaje = MIMEMultipart()
    mensaje['From'] = CORREO_REMITENTE
    mensaje['To'] = correo_destino
    mensaje['Subject'] = asunto
    mensaje.attach(MIMEText(cuerpo_html, 'html'))

    try:
        servidor = smtplib.SMTP('smtp.gmail.com', 587)
        servidor.starttls() 
        servidor.login(CORREO_REMITENTE, CONTRASENA_APP)
        servidor.sendmail(CORREO_REMITENTE, correo_destino, mensaje.as_string())
        servidor.quit()
        print(f"ÉXITO: Correo enviado a {correo_destino}")
        return True
    except Exception as e:
        print(f"ERROR: No se pudo enviar el correo a {correo_destino}. Detalle: {str(e)}")
        return False