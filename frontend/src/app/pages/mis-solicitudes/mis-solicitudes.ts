import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { SolicitudService } from '../../../core/service/solicitud-service';
import { SolicitudesEstudiante, SolicitudDetallada } from '../../../core/interfaces/interfaces';
import { formatearFecha, claseEstado } from '../../../helpers/helpers';

const NOMBRES_TIPO_DOCUMENTO: Record<number, string> = {
  1: 'Credencial Escolar',
  2: 'Tira de Materias',
  3: 'Tarjeta de Circulación',
  4: 'Licencia de Conducir',
};

const DOCS_REQUERIDOS: Record<string, { id: number; nombre: string }[]> = {
  locker: [
    { id: 1, nombre: 'Credencial Escolar' },
    { id: 2, nombre: 'Tira de Materias' },
  ],
  estacionamiento: [
    { id: 1, nombre: 'Credencial Escolar' },
    { id: 2, nombre: 'Tira de Materias' },
    { id: 3, nombre: 'Tarjeta de Circulación' },
    { id: 4, nombre: 'Licencia de Conducir' },
  ],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-mis-solicitudes',
  standalone: false,
  templateUrl: './mis-solicitudes.html',
  styleUrl: './mis-solicitudes.css',
})
export class MisSolicitudes {

  solicitudesUsuario = inject(SolicitudService);
  private cdr = inject(ChangeDetectorRef);
  numeroCuenta = localStorage.getItem("numeroCuenta") || '';

  modalAbierto = false;
  solicitudSeleccionada: SolicitudDetallada | null = null;
  cargandoModal = false;
  subiendoDocumento: Record<number, boolean> = {};
  private detallesCache: SolicitudDetallada[] | null = null;

  ngOnInit(){
    this.getSolicitudes();
  }

  getSolicitudes(){
    this.solicitudesUsuario.listarMisSolicitudes(this.numeroCuenta).subscribe({ error: () => {} });
  }

  verDocumentos(sol: SolicitudesEstudiante): void {
    this.modalAbierto = true;
    this.cargandoModal = true;
    this.solicitudSeleccionada = null;
    this.subiendoDocumento = {};
    this.cargarDetalleModal(sol.id_solicitud);
  }

  private cargarDetalleModal(idSolicitud: string, forzarRecarga = false): void {
    if (this.detallesCache && !forzarRecarga) {
      this.solicitudSeleccionada =
        this.detallesCache.find(s => String(s.id_solicitud) === String(idSolicitud)) ?? null;
      this.cargandoModal = false;
      this.cdr.detectChanges();
      return;
    }

    this.solicitudesUsuario.obtenerSolicitudesDetalladas(this.numeroCuenta).subscribe({
      next: (response) => {
        this.detallesCache = response.solicitudes;
        this.solicitudSeleccionada =
          this.detallesCache.find(s => String(s.id_solicitud) === String(idSolicitud)) ?? null;
        this.cargandoModal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoModal = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.solicitudSeleccionada = null;
    this.subiendoDocumento = {};
  }

  getNombreDocumento(idTipo: number): string {
    return NOMBRES_TIPO_DOCUMENTO[idTipo] ?? `Documento ${idTipo}`;
  }

  getTipoLabel(tipo: string): string {
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  onResubirDocumento(event: Event, idTipoDocumento: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || !this.solicitudSeleccionada) return;

    if (file.size > MAX_FILE_SIZE) {
      this.solicitudesUsuario.peticionError(`El archivo supera el máximo de 5 MB.`);
      return;
    }

    const idSolicitud = Number(this.solicitudSeleccionada.id_solicitud);
    this.subiendoDocumento = { ...this.subiendoDocumento, [idTipoDocumento]: true };

    this.solicitudesUsuario.subirDocumento(idSolicitud, idTipoDocumento, file).subscribe({
      next: () => {
        this.solicitudesUsuario.peticionSuccess('Documento actualizado correctamente.');
        const idSol = this.solicitudSeleccionada!.id_solicitud;
        this.cargandoModal = true;
        this.subiendoDocumento = {};
        this.detallesCache = null;
        this.cargarDetalleModal(idSol, true);
        this.getSolicitudes();
      },
      error: () => {
        this.subiendoDocumento = { ...this.subiendoDocumento, [idTipoDocumento]: false };
      },
    });
  }

  getFechaFormateada(fecha:string){
    return formatearFecha(fecha);
  }

  getClaseEstado(estado: string): string {
    return claseEstado(estado);
  }

  getDocsFaltantes(): { id: number; nombre: string }[] {
    const sol = this.solicitudSeleccionada;
    if (!sol || sol.estado_solicitud !== 'DATOS_INCOMPLETOS') return [];
    const requeridos = DOCS_REQUERIDOS[sol.tipo_tramite.toLowerCase()] ?? [];
    const subidos = new Set(sol.documentos_tramite.map(d => d.id_tipo_documento));
    return requeridos.filter(d => !subidos.has(d.id));
  }

  reenviarSolicitud(): void {
    if (!this.solicitudSeleccionada) return;
    const idSolicitud = Number(this.solicitudSeleccionada.id_solicitud);
    this.solicitudesUsuario.finalizarSolicitud(idSolicitud).subscribe({
      next: () => {
        this.solicitudesUsuario.peticionSuccess('Solicitud re-enviada correctamente.');
        const idSol = this.solicitudSeleccionada!.id_solicitud;
        this.detallesCache = null;
        this.cargarDetalleModal(idSol, true);
        this.getSolicitudes();
      },
      error: () => {},
    });
  }

}
