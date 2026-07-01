import os
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY

CARPETA_UPLOADS = "uploads"
CARPETA_ASSETS = "app/utils/assets"

if not os.path.exists(CARPETA_UPLOADS):
    os.makedirs(CARPETA_UPLOADS)

def generar_documento(folio: str, token_qr: str, nombre_alumno: str, cuenta_alumno: str, tipo_tramite: str, vigencia: str, codigo_locker: str = "N/A", ubicacion_locker: str = "N/A") -> str:
    """
    Genera un PDF (Constancia o Tarjetón) con diseño profesional e incrusta el código QR.
    """
    
    nombre_archivo = f"{tipo_tramite}_{folio}.pdf"
    ruta_pdf = os.path.join(CARPETA_UPLOADS, nombre_archivo)
    
    # Generar QR
    datos_qr = f"https://sistema-cuut.uaemex.mx/verificar/{token_qr}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(datos_qr)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")
    
    ruta_qr_temp = os.path.join(CARPETA_UPLOADS, f"temp_qr_{folio}.png")
    img_qr.save(ruta_qr_temp)

    c = canvas.Canvas(ruta_pdf, pagesize=letter)
    ancho, alto = letter 

    # COLORES
    verde_oscuro = colors.HexColor("#1D4A3C")
    verde_claro = colors.HexColor("#14412E")
    gris_texto = colors.HexColor("#555555")
    gris_claro = colors.HexColor("#888888")
    fondo_gris = colors.HexColor("#F2F4F2")

    # HEADER
    ruta_logo = os.path.join(CARPETA_ASSETS, "logo_uaemex.png")
    if os.path.exists(ruta_logo):
        c.drawImage(ruta_logo, 40, alto - 95, width=65, height=75, preserveAspectRatio=True, mask='auto')

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.black)
    c.drawString(115, alto - 45, "Universidad Autónoma del Estado de México")
    
    c.setFont("Helvetica", 12)
    c.drawString(115, alto - 60, "Centro Universitario UAEMex Tianguistenco")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(gris_claro)
    c.drawString(115, alto - 75, "SISTEMA CUUT ACADÉMICO")

    # Cuadro Folio 
    c.setFillColor(fondo_gris)
    c.roundRect(ancho - 160, alto - 85, 120, 45, 6, fill=1, stroke=0)
    
    c.setFillColor(gris_claro)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(ancho - 100, alto - 55, "FOLIO DE TRÁMITE")
    
    c.setFillColor(verde_claro)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(ancho - 100, alto - 72, folio)

    # TITULO Y FECHA
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 16)
    titulo_principal = "Tarjetón de Estacionamiento" if tipo_tramite.lower() == "estacionamiento" else "Constancia de Asignación de Locker"
    c.drawString(40, alto - 135, titulo_principal)

    meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    hoy = datetime.now()
    fecha_emision = f"Fecha de Emisión: {hoy.day} de {meses[hoy.month-1]}, {hoy.year}"
    
    c.setFillColor(gris_claro)
    c.setFont("Helvetica", 10)
    c.drawRightString(ancho - 40, alto - 135, fecha_emision)

    # TEXTO INTRODUCTORIO

    estilo_justificado = ParagraphStyle(
        name='Justificado',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )
    
    texto_parrafo = f"""
    A quien corresponda,<br/><br/>
    Por medio de la presente, la Dirección de Servicios Estudiantiles del Centro Universitario 
    Tianguistenco hace constar la asignación formal del permiso de {tipo_tramite.lower()} temporalmente, para el uso 
    exclusivo del estudiante cuyos datos se detallan a continuación. 
    Esta asignación está sujeta al cumplimiento de los lineamientos internos de uso de instalaciones y 
    recursos institucionales.
    """
    
    p = Paragraph(texto_parrafo, estilo_justificado)
    ancho_disponible = ancho - 80 
    

    ancho_parrafo, alto_parrafo = p.wrap(ancho_disponible, alto)
    y_texto = alto - 160 - alto_parrafo 
    p.drawOn(c, 40, y_texto)


    # TARJETON DE ESTACIONAMIENTO
    if tipo_tramite.lower() == "estacionamiento":
        # Separador punteado 
        y_linea_sup = y_texto - 20
        c.setDash(4, 4)
        c.setStrokeColor(gris_claro)
        c.line(40, y_linea_sup, ancho - 40, y_linea_sup)
        c.setDash(1, 0) 

        # (Tarjeta)
        y_tarjeta = y_linea_sup - 270
        c.setStrokeColor(gris_claro)
        c.setFillColor(colors.white)
        c.roundRect(40, y_tarjeta, ancho - 80, 250, 10, fill=0, stroke=1)

        # Header de tarjeta
        c.setFillColor(verde_oscuro)
        c.roundRect(40, y_tarjeta + 220, ancho - 80, 30, 10, fill=1, stroke=0)
        c.rect(40, y_tarjeta + 220, ancho - 80, 15, fill=1, stroke=0) 
        
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y_tarjeta + 230, "A C C E S O   V E H I C U L A R")

        # Barra Inferior Gris
        c.setFillColor(fondo_gris)
        c.roundRect(40, y_tarjeta, ancho - 80, 30, 10, fill=1, stroke=0)
        c.rect(40, y_tarjeta + 15, ancho - 80, 15, fill=1, stroke=0) 
        
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 9)
        c.drawCentredString(ancho / 2, y_tarjeta + 10, "Documento personal e intransferible")

        # Codigo QR 
        c.setStrokeColor(gris_claro)
        c.rect(70, y_tarjeta + 50, 140, 140, fill=0, stroke=1)
        c.drawImage(ruta_qr_temp, 75, y_tarjeta + 55, width=130, height=130)
        c.setFont("Helvetica", 8)
        c.setFillColor(gris_texto)
        c.drawCentredString(140, y_tarjeta + 115, "QR") 

        # Datos del alumno 
        x_datos = 260
        y_datos = y_tarjeta + 175
        
        c.setFont("Helvetica", 9)
        c.drawString(x_datos, y_datos, "Nombre del Alumno")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.black)
        c.drawString(x_datos, y_datos - 15, nombre_alumno.upper())

        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 9)
        c.drawString(x_datos, y_datos - 45, "Número de Cuenta")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.black)
        c.drawString(x_datos, y_datos - 60, cuenta_alumno)

        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 9)
        c.drawString(x_datos, y_datos - 90, "Vigencia")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.black)
        c.drawString(x_datos, y_datos - 105, vigencia)

        # Linea de recorte
        y_recorte = y_tarjeta - 25
        c.setDash(4, 4)
        c.setStrokeColor(gris_claro)
        c.line(40, y_recorte, ancho - 40, y_recorte)
        c.setDash(1, 0)
        
        c.setFillColor(colors.white)
        c.rect(ancho/2 - 70, y_recorte - 8, 140, 16, fill=1, stroke=0)
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 8)
        c.drawCentredString(ancho / 2, y_recorte - 3, "Recortar por la línea punteada")

        # Condiciones de Uso
        y_condiciones = y_recorte - 30
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y_condiciones, "CONDICIONES DE USO")
        
        c.setFont("Helvetica", 10)
        condiciones = [
            "Este tarjetón debe estar visible en el tablero del vehículo en todo momento.",
            "La universidad no se hace responsable por robos o daños parciales o totales.",
            "El mal uso de este documento cancelará permanentemente el derecho a estacionamiento.",
            "Válido únicamente para las áreas designadas"
        ]
        
        y_bullet = y_condiciones - 25
        for cond in condiciones:
            c.circle(45, y_bullet + 3, 2, fill=1, stroke=0)
            c.drawString(55, y_bullet, cond)
            y_bullet -= 22


    # CONSTANCIA DE LOCKER
    else:
        y_tarjeta = y_texto - 210
        c.setStrokeColor(verde_claro)
        c.setFillColor(colors.white)
        c.roundRect(40, y_tarjeta, ancho - 80, 180, 8, fill=0, stroke=1)

        # Header Tarjeta
        c.setFillColor(verde_claro)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(55, y_tarjeta + 155, "I N F O R M A C I Ó N   D E L   E S T U D I A N T E")
        
        c.setStrokeColor(fondo_gris)
        c.line(55, y_tarjeta + 145, ancho - 55, y_tarjeta + 145)
        y_label = y_tarjeta + 120
        y_value = y_tarjeta + 105
        
        # Datos 1
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 8)
        c.drawString(55, y_label, "Nombre del Alumno")
        c.drawString(300, y_label, "Número de Cuenta")
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y_value, nombre_alumno.upper())
        c.drawString(300, y_value, cuenta_alumno)

        # Datos 2
        y_label -= 45
        y_value -= 45
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 8)
        c.drawString(55, y_label, "Locker Asignado")
        c.drawString(300, y_label, "Vigencia de Uso")
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y_value, f"Locker: {codigo_locker}")
        c.drawString(300, y_value, vigencia)

        # Separador de adentro
        c.setStrokeColor(fondo_gris)
        c.line(55, y_value - 15, ancho - 55, y_value - 15)

        # Datos 3
        y_label -= 45
        y_value -= 45
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 8)
        c.drawString(55, y_label, "Ubicación del Locker")
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(55, y_value, ubicacion_locker)

        # Condiciones de Uso
        y_condiciones = y_tarjeta - 40
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y_condiciones, "CLÁUSULAS DE USO")
        
        c.setFont("Helvetica", 10)
        clausulas = [
            "El uso del locker es personal e intransferible.",
            "La universidad no se hace responsable por los objetos de valor despojados en el interior.",
            "Al termino del ciclo escolar, el locker deberá ser desocupado íntegramente.",
            "Cualquier daño al inmueble será responsabilidad del usuario asignado"
        ]
        
        y_bullet = y_condiciones - 25
        for clau in clausulas:
            c.circle(45, y_bullet + 3, 2, fill=1, stroke=0)
            c.drawString(55, y_bullet, clau)
            y_bullet -= 22

        y_footer = 50
        
        # QR
        c.setStrokeColor(gris_claro)
        c.rect(60, y_footer + 15, 75, 75, fill=0, stroke=1)
        c.drawImage(ruta_qr_temp, 62, y_footer + 17, width=71, height=71)
        
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 7)
        c.drawCentredString(97, y_footer + 3, "Escanea para verificar validez")

        # Datos de Contacto
        c.setFillColor(verde_claro)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(ancho - 40, y_footer + 80, "Centro Universitario UAEM Tianguistenco")
        
        c.setFillColor(gris_texto)
        c.setFont("Helvetica", 7)
        c.drawRightString(ancho - 40, y_footer + 68, "Tejocote, San Pedro Tlaltizapan, 52640 Santiago")
        c.drawRightString(ancho - 40, y_footer + 58, "Tianguistenco, Méx.")
        c.drawRightString(ancho - 40, y_footer + 43, "+52 722 481 0800")
        c.drawRightString(ancho - 40, y_footer + 33, "cuutianguistenco@uaemex.mx")

    # FOOTER UNIVERSAL
    c.setFillColor(gris_claro)
    c.setFont("Helvetica", 7)
    c.drawString(40, 20, f"ID de Verificación: {token_qr}")
    c.drawRightString(ancho - 40, 20, f"DOCUMENTO OFICIAL UNIVERSITARIO • {hoy.year}")

    c.save()

    if os.path.exists(ruta_qr_temp):
        os.remove(ruta_qr_temp)

    return nombre_archivo