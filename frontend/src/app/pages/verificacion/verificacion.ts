import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import Swal from 'sweetalert2';
import { GuardiaService } from '../../../core/service/guardia-service';
import {
  HistorialVerificacionItem,
  VerificacionQrResponse,
} from '../../../core/interfaces/guardia-interfaces';

type EstadoEscaner = 'idle' | 'escaneando' | 'procesando' | 'confirmando' | 'resultado';

@Component({
  selector: 'app-verificacion',
  standalone: false,
  templateUrl: './verificacion.html',
  styleUrl: './verificacion.css',
})
export class Verificacion implements OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private idGuardia = Number(localStorage.getItem('idAdmin')) || 0;

  estado: EstadoEscaner = 'idle';
  errorCamara = '';
  mensajeError = '';

  resultadoValido = false;
  mensajeResultado = '';
  datosAlumno: VerificacionQrResponse | null = null;

  historialTurno: HistorialVerificacionItem[] = [];

  // ── Confirmación de identidad / vehículo (previa a registrar el acceso) ──
  confirmacionIdentidad: boolean | null = null;
  confirmacionVehiculo: boolean | null = null;
  motivoDenegacion = '';
  evidenciaArchivo: File | null = null;
  registrando = false;

  private stream: MediaStream | null = null;
  private frameId = 0;
  private ultimoTokenLeido = '';

  constructor(
    private guardiaService: GuardiaService,
    private cdr: ChangeDetectorRef,
  ) {}

  async iniciarEscaneo() {
    // Solo bloquea reentradas mientras la cámara ya está activa o hay un
    // escaneo en curso; debe poder relanzarse desde 'idle' y desde 'resultado'
    // (botón "Escanear siguiente").
    if (this.estado === 'escaneando' || this.estado === 'procesando' || this.estado === 'confirmando') {
      return;
    }

    this.errorCamara = '';
    this.mensajeError = '';
    this.mensajeResultado = '';
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
      next: (respuesta) => this.mostrarResultadoQr(respuesta),
      error: () => this.mostrarError('No se pudo verificar el código. Intenta de nuevo.'),
    });
  }

  // El QR solo dice si el permiso está vigente. Si lo está, falta que el guardia
  // confirme físicamente identidad y vehículo antes de registrar el acceso.
  private mostrarResultadoQr(respuesta: VerificacionQrResponse) {
    this.datosAlumno = respuesta;

    if (respuesta.estado_acceso !== 'VIGENTE') {
      this.resultadoValido = false;
      this.mensajeResultado = '';
      this.estado = 'resultado';
      this.historialTurno.unshift({
        hora: this.horaActual(),
        nombre_completo: respuesta.alumno.nombre_completo,
        numero_cuenta: respuesta.alumno.numero_cuenta,
        tipo_tramite: respuesta.tipo_tramite,
        resultado: 'INVALIDO',
        detalle: respuesta.estado_acceso,
      });
      this.cdr.detectChanges();
      return;
    }

    this.confirmacionIdentidad = null;
    this.confirmacionVehiculo = respuesta.tipo_tramite === 'ESTACIONAMIENTO' ? null : true;
    this.motivoDenegacion = '';
    this.evidenciaArchivo = null;
    this.estado = 'confirmando';
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

  // ── Confirmación de identidad / vehículo ──────────────────────
  seleccionarIdentidad(coincide: boolean) {
    this.confirmacionIdentidad = coincide;
  }

  seleccionarVehiculo(coincide: boolean) {
    this.confirmacionVehiculo = coincide;
  }

  get requiereMotivo(): boolean {
    return this.confirmacionIdentidad === false || this.confirmacionVehiculo === false;
  }

  get listoParaConfirmar(): boolean {
    if (!this.datosAlumno) return false;
    if (this.confirmacionIdentidad === null) return false;
    if (this.datosAlumno.tipo_tramite === 'ESTACIONAMIENTO' && this.confirmacionVehiculo === null) {
      return false;
    }
    if (this.requiereMotivo && !this.motivoDenegacion.trim()) return false;
    return true;
  }

  onEvidenciaSeleccionada(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.evidenciaArchivo = input.files?.[0] ?? null;
  }

  cancelarConfirmacion() {
    this.estado = 'idle';
    this.datosAlumno = null;
  }

  confirmarAcceso() {
    const det = this.datosAlumno;
    if (!det || !this.listoParaConfirmar) return;

    const identidadConfirmada = !!this.confirmacionIdentidad;
    const vehiculoCoincide = !!this.confirmacionVehiculo;

    this.registrando = true;
    this.guardiaService
      .registrarAcceso({
        id_guardia: this.idGuardia,
        id_asignacion: det.id_asignacion,
        identidad_confirmada: identidadConfirmada,
        vehiculo_coincide: vehiculoCoincide,
        motivo: this.requiereMotivo ? this.motivoDenegacion.trim() : undefined,
        evidencia: this.requiereMotivo ? this.evidenciaArchivo : null,
      })
      .subscribe({
        next: (resp) => {
          this.registrando = false;
          this.resultadoValido = identidadConfirmada && vehiculoCoincide;
          this.mensajeResultado = resp.mensaje;
          this.mensajeError = '';
          this.estado = 'resultado';

          this.historialTurno.unshift({
            hora: this.horaActual(),
            nombre_completo: det.alumno.nombre_completo,
            numero_cuenta: det.alumno.numero_cuenta,
            tipo_tramite: det.tipo_tramite,
            resultado: this.resultadoValido ? 'VALIDO' : 'INVALIDO',
            detalle: resp.mensaje,
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.registrando = false;
          Swal.fire({
            icon: 'error',
            title: err?.error?.detail || 'No se pudo registrar el acceso.',
            timer: 2500,
            showConfirmButton: false,
          });
          this.cdr.detectChanges();
        },
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
