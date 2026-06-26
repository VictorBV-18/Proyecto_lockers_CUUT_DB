import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { PersonalService } from '../../../core/service/personal-service';
import { Solicitud, SolicitudDetalleRevisor } from '../../../core/interfaces/personalinterfaces';
import { claseEstado, formatearFecha } from '../../../helpers/helpers';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitudes',
  standalone: false,
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class Solicitudes {
  peticionesPersonal = inject(PersonalService);
  private cdr = inject(ChangeDetectorRef);

  idAdmin = Number(localStorage.getItem('idAdmin')) || 0;

  modalAbierto = false;
  cargandoModal = false;
  solicitudDetalle: SolicitudDetalleRevisor | null = null;

  rechazandoDoc: Record<number, boolean> = {};
  motivoRechazo: Record<number, string> = {};
  procesandoDoc: Record<number, boolean> = {};

  ngOnInit() {
    this.obtenerSolicitudes();
  }

  obtenerSolicitudes() {
    this.peticionesPersonal.listarSolicitudes().subscribe();
  }

  verSolicitud(sol: Solicitud): void {
    this.modalAbierto = true;
    this.cargandoModal = true;
    this.solicitudDetalle = null;
    this.rechazandoDoc = {};
    this.motivoRechazo = {};
    this.procesandoDoc = {};

    this.peticionesPersonal.obtenerDetalleSolicitud(sol.id_solicitud).subscribe({
      next: (detalle) => {
        this.solicitudDetalle = detalle;
        this.cargandoModal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoModal = false;
        this.modalAbierto = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.solicitudDetalle = null;
    this.rechazandoDoc = {};
    this.motivoRechazo = {};
    this.procesandoDoc = {};
  }

  iniciarRechazo(idDocumento: number): void {
    this.rechazandoDoc = { ...this.rechazandoDoc, [idDocumento]: true };
    this.motivoRechazo = { ...this.motivoRechazo, [idDocumento]: '' };
  }

  cancelarRechazo(idDocumento: number): void {
    this.rechazandoDoc = { ...this.rechazandoDoc, [idDocumento]: false };
    this.motivoRechazo = { ...this.motivoRechazo, [idDocumento]: '' };
  }

  aprobarDocumento(idDocumento: number): void {
    if (!this.solicitudDetalle) return;

    this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: true };

    this.peticionesPersonal
      .aprobarDocumento(this.solicitudDetalle.id_solicitud, idDocumento, this.idAdmin)
      .subscribe({
        next: () => {
          this.actualizarEstadoDoc(idDocumento, 'APROBADO', null);
          this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: false };
          this.obtenerSolicitudes();
        },
        error: () => {
          this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: false };
          Swal.fire({ icon: 'error', title: 'Error al aprobar el documento', timer: 1500, showConfirmButton: false });
        },
      });
  }

  confirmarRechazo(idDocumento: number): void {
    const motivo = (this.motivoRechazo[idDocumento] || '').trim();
    if (!motivo) {
      Swal.fire({ icon: 'warning', title: 'Debes ingresar el motivo del rechazo.', timer: 1800, showConfirmButton: false });
      return;
    }
    if (!this.solicitudDetalle) return;

    this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: true };

    this.peticionesPersonal
      .rechazarDocumento(this.solicitudDetalle.id_solicitud, idDocumento, this.idAdmin, motivo)
      .subscribe({
        next: () => {
          this.actualizarEstadoDoc(idDocumento, 'RECHAZADO', motivo);
          this.rechazandoDoc = { ...this.rechazandoDoc, [idDocumento]: false };
          this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: false };
          this.obtenerSolicitudes();
        },
        error: () => {
          this.procesandoDoc = { ...this.procesandoDoc, [idDocumento]: false };
          Swal.fire({ icon: 'error', title: 'Error al rechazar el documento', timer: 1500, showConfirmButton: false });
        },
      });
  }

  private actualizarEstadoDoc(
    idDocumento: number,
    estado: 'APROBADO' | 'RECHAZADO',
    comentario: string | null,
  ): void {
    if (!this.solicitudDetalle) return;
    this.solicitudDetalle = {
      ...this.solicitudDetalle,
      documentos: this.solicitudDetalle.documentos.map((d) =>
        d.id_documento === idDocumento
          ? { ...d, estado_documento: estado, comentario_admin: comentario }
          : d,
      ),
    };
  }

  getTipoLabel(tipo: string): string {
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  formatearFecha(fecha: string): string {
    return formatearFecha(fecha);
  }

  getClaseEstado(estado: string): string {
    return claseEstado(estado);
  }
}
