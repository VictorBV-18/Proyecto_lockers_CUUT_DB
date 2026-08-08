import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import Swal from 'sweetalert2';
import { GuardiaService } from '../../../core/service/guardia-service';
import {
  HistorialVerificacionItem,
  VerificacionQrResponse,
} from '../../../core/interfaces/guardia-interfaces';

type EstadoEscaner = 'idle' | 'escaneando' | 'procesando' | 'resultado';

@Component({
  selector: 'app-verificacion',
  standalone: false,
  templateUrl: './verificacion.html',
  styleUrl: './verificacion.css',
})
export class Verificacion implements OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  estado: EstadoEscaner = 'idle';
  errorCamara = '';
  mensajeError = '';

  resultadoValido = false;
  datosAlumno: VerificacionQrResponse | null = null;

  historialTurno: HistorialVerificacionItem[] = [];

  mostrarModalReporte = false;
  descripcionReporte = '';

  private stream: MediaStream | null = null;
  private frameId = 0;
  private ultimoTokenLeido = '';

  constructor(
    private guardiaService: GuardiaService,
    private cdr: ChangeDetectorRef,
  ) {}

  async iniciarEscaneo() {
    if (this.estado !== 'idle') return;

    this.errorCamara = '';
    this.mensajeError = '';
    this.datosAlumno = null;
    this.ultimoTokenLeido = '';

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      this.errorCamara = 'No se pudo acceder a la cámara. Revisa los permisos del navegador.';
      this.cdr.detectChanges();
      return;
    }

    this.estado = 'escaneando';
    this.cdr.detectChanges();
    const video = this.videoRef.nativeElement;
    video.srcObject = this.stream;
    await video.play();
    this.frameId = requestAnimationFrame(() => this.leerFrame());
  }

  cancelarEscaneo() {
    this.detenerCamara();
    this.estado = 'idle';
  }

  escanearSiguiente() {
    this.iniciarEscaneo();
  }

  private leerFrame() {
    if (this.estado !== 'escaneando') return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const contexto = canvas.getContext('2d')!;
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imagen = contexto.getImageData(0, 0, canvas.width, canvas.height);
      const codigo = jsQR(imagen.data, imagen.width, imagen.height);

      if (codigo?.data && codigo.data !== this.ultimoTokenLeido) {
        this.ultimoTokenLeido = codigo.data;
        this.procesarQr(codigo.data);
        return;
      }
    }

    this.frameId = requestAnimationFrame(() => this.leerFrame());
  }

  private extraerToken(valorQr: string): string {
    const partes = valorQr.split('/').filter((parte) => parte.length > 0);
    return partes.length > 0 ? partes[partes.length - 1] : valorQr;
  }

  private procesarQr(valorQr: string) {
    this.detenerCamara();
    this.estado = 'procesando';
    this.cdr.detectChanges();
    const token = this.extraerToken(valorQr);

    this.guardiaService.verificarQr(token).subscribe({
      next: (respuesta) => this.mostrarResultado(respuesta),
      error: () => this.mostrarError('No se pudo verificar el código. Intenta de nuevo.'),
    });
  }

  private mostrarResultado(respuesta: VerificacionQrResponse) {
    this.datosAlumno = respuesta;
    this.resultadoValido = respuesta.estado_acceso === 'VIGENTE';
    this.estado = 'resultado';

    this.historialTurno.unshift({
      hora: this.horaActual(),
      nombre_completo: respuesta.alumno.nombre_completo,
      numero_cuenta: respuesta.alumno.numero_cuenta,
      tipo_tramite: respuesta.tipo_tramite,
      resultado: this.resultadoValido ? 'VALIDO' : 'INVALIDO',
      detalle: respuesta.estado_acceso,
    });
    this.cdr.detectChanges();
  }

  private mostrarError(mensaje: string) {
    this.datosAlumno = null;
    this.resultadoValido = false;
    this.mensajeError = mensaje;
    this.estado = 'resultado';

    this.historialTurno.unshift({
      hora: this.horaActual(),
      nombre_completo: '—',
      numero_cuenta: '—',
      tipo_tramite: '—',
      resultado: 'INVALIDO',
      detalle: mensaje,
    });
    this.cdr.detectChanges();
  }

  abrirModalReporte() {
    this.descripcionReporte = '';
    this.mostrarModalReporte = true;
  }

  cerrarModalReporte() {
    this.mostrarModalReporte = false;
  }

  enviarReporte() {
    if (!this.descripcionReporte.trim()) return;
    this.cerrarModalReporte();
    Swal.fire({
      icon: 'info',
      title: 'Reporte de incidentes no disponible aún',
      text: 'Esta función estará activa cuando se implemente el endpoint correspondiente en el backend.',
      timer: 3500,
      showConfirmButton: false,
    });
  }

  private horaActual(): string {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  private detenerCamara() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  ngOnDestroy() {
    this.detenerCamara();
  }
}
