import { Component, computed, inject, signal } from '@angular/core';
import { PersonalService } from '../../../core/service/personal-service';
import { AdminService } from '../../../core/service/admin-service';
import { Solicitud, SolicitudDetalleRevisor } from '../../../core/interfaces/personalinterfaces';
import { AceptarSolicitudResponse, LockerItem } from '../../../core/interfaces/admin-interfaces';
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
  private adminService = inject(AdminService);

  idAdmin = Number(localStorage.getItem('idAdmin')) || 0;

  // ── Signals (reactivos como useState en React) ────────────────
  modalAbierto       = signal(false);
  cargandoModal      = signal(false);
  solicitudDetalle   = signal<SolicitudDetalleRevisor | null>(null);

  rechazandoDoc      = signal<Record<number, boolean>>({});
  procesandoDoc      = signal<Record<number, boolean>>({});

  accionSolicitud    = signal<'idle' | 'seleccionando-locker' | 'rechazando'>('idle');
  lockersDisponibles = signal<LockerItem[]>([]);
  cargandoLockers    = signal(false);
  procesandoSolicitud = signal(false);

  // Sprint 5: generación de documento
  documentoGenerado   = signal<AceptarSolicitudResponse | null>(null);
  procesandoAceptar   = signal(false);
  mesesVigencia       = 4;

  // Propiedades normales solo para ngModel (actualizadas por el usuario, no async)
  motivoRechazo: Record<number, string> = {};
  lockerSeleccionado: number | null = null;
  motivoRechazoSolicitud = '';

  // ── Computed (derivados de signals, como useMemo) ─────────────
  todosAprobados = computed(() => {
    const det = this.solicitudDetalle();
    if (!det || det.documentos.length === 0) return false;
    return det.documentos.every(d => d.estado_documento === 'APROBADO');
  });

  hayRechazado = computed(() => {
    const det = this.solicitudDetalle();
    if (!det) return false;
    return det.documentos.some(d => d.estado_documento === 'RECHAZADO');
  });

  // Paso 3 del flujo Sprint 5: solicitud APROBADA pero sin documento generado aún
  solicitudAprobadaSinDocumento = computed(() =>
    this.solicitudDetalle()?.estado === 'APROBADA' && !this.documentoGenerado()
  );

  // Solicitud completamente cerrada (rechazo o documento ya emitido)
  solicitudFinalizada = computed(() => {
    const det = this.solicitudDetalle();
    if (!det) return true;
    return det.estado === 'DOCUMENTACION_INCORRECTA' || !!this.documentoGenerado();
  });

  // Panel de aprobación/rechazo solo cuando la solicitud está PENDIENTE con docs evaluados
  mostrarPanelAccion = computed(() => {
    const det = this.solicitudDetalle();
    if (!det || det.estado === 'APROBADA') return false;
    return !this.solicitudFinalizada() && (this.todosAprobados() || this.hayRechazado());
  });

  // ── Init ──────────────────────────────────────────────────────
  ngOnInit() {
    this.obtenerSolicitudes();
  }

  obtenerSolicitudes() {
    this.peticionesPersonal.listarSolicitudes().subscribe();
  }

  // ── Modal ─────────────────────────────────────────────────────
  verSolicitud(sol: Solicitud): void {
    this.modalAbierto.set(true);
    this.cargandoModal.set(true);
    this.solicitudDetalle.set(null);
    this.rechazandoDoc.set({});
    this.procesandoDoc.set({});
    this.motivoRechazo = {};
    this.resetAccionSolicitud();

    this.peticionesPersonal.obtenerDetalleSolicitud(sol.id_solicitud).subscribe({
      next: (detalle) => {
        this.solicitudDetalle.set(detalle);
        this.cargandoModal.set(false);
      },
      error: () => {
        this.cargandoModal.set(false);
        this.modalAbierto.set(false);
      },
    });
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.solicitudDetalle.set(null);
    this.rechazandoDoc.set({});
    this.procesandoDoc.set({});
    this.motivoRechazo = {};
    this.documentoGenerado.set(null);
    this.mesesVigencia = 4;
    this.resetAccionSolicitud();
  }

  private resetAccionSolicitud(): void {
    this.accionSolicitud.set('idle');
    this.lockersDisponibles.set([]);
    this.lockerSeleccionado = null;
    this.cargandoLockers.set(false);
    this.motivoRechazoSolicitud = '';
    this.procesandoSolicitud.set(false);
  }

  // ── Aprobar solicitud ─────────────────────────────────────────
  iniciarAprobacion(): void {
    const det = this.solicitudDetalle();
    if (!det) return;

    if (det.tipo_tramite.toLowerCase() === 'locker') {
      this.accionSolicitud.set('seleccionando-locker');
      this.cargandoLockers.set(true);
      this.adminService.obtenerInventarioLockers().subscribe({
        next: (resp) => {
          this.lockersDisponibles.set(resp.lockers_disponibles);
          this.cargandoLockers.set(false);
        },
        error: () => {
          this.cargandoLockers.set(false);
          this.accionSolicitud.set('idle');
          Swal.fire({ icon: 'error', title: 'Error al cargar lockers disponibles', timer: 1500, showConfirmButton: false });
        },
      });
    } else {
      this.aprobarEstacionamiento();
    }
  }

  confirmarAprobacionLocker(): void {
    const det = this.solicitudDetalle();
    if (!det || !this.lockerSeleccionado) return;
    this.procesandoSolicitud.set(true);

    this.adminService.aprobarLocker(det.id_solicitud, {
      id_admin: this.idAdmin,
      id_locker: this.lockerSeleccionado,
    }).subscribe({
      next: () => {
        this.solicitudDetalle.set({ ...det, estado: 'APROBADA' });
        this.procesandoSolicitud.set(false);
        this.resetAccionSolicitud();
        this.obtenerSolicitudes();
        Swal.fire({ icon: 'success', title: 'Solicitud de locker aprobada', timer: 1800, showConfirmButton: false });
      },
      error: (err) => {
        this.procesandoSolicitud.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.detail || 'Error al aprobar la solicitud', timer: 2200, showConfirmButton: false });
      },
    });
  }

  private aprobarEstacionamiento(): void {
    const det = this.solicitudDetalle();
    if (!det) return;
    this.procesandoSolicitud.set(true);

    this.adminService.aprobarEstacionamiento(det.id_solicitud, { id_admin: this.idAdmin }).subscribe({
      next: () => {
        this.solicitudDetalle.set({ ...det, estado: 'APROBADA' });
        this.procesandoSolicitud.set(false);
        this.resetAccionSolicitud();
        this.obtenerSolicitudes();
        Swal.fire({ icon: 'success', title: 'Solicitud de estacionamiento aprobada', timer: 1800, showConfirmButton: false });
      },
      error: (err) => {
        this.procesandoSolicitud.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.detail || 'Error al aprobar la solicitud', timer: 2200, showConfirmButton: false });
      },
    });
  }

  cancelarAprobacion(): void {
    this.resetAccionSolicitud();
  }

  // ── Rechazar solicitud completa ───────────────────────────────
  iniciarRechazoSolicitud(): void {
    this.accionSolicitud.set('rechazando');
    this.motivoRechazoSolicitud = '';
  }

  confirmarRechazoSolicitud(): void {
    const motivo = this.motivoRechazoSolicitud.trim();
    if (!motivo) {
      Swal.fire({ icon: 'warning', title: 'Debes ingresar el motivo del rechazo.', timer: 1800, showConfirmButton: false });
      return;
    }
    const det = this.solicitudDetalle();
    if (!det) return;
    this.procesandoSolicitud.set(true);

    this.adminService.rechazarSolicitud(det.id_solicitud, { id_admin: this.idAdmin, motivo }).subscribe({
      next: () => {
        this.solicitudDetalle.set({ ...det, estado: 'DOCUMENTACION_INCORRECTA' });
        this.procesandoSolicitud.set(false);
        this.resetAccionSolicitud();
        this.obtenerSolicitudes();
        Swal.fire({ icon: 'success', title: 'Solicitud rechazada', timer: 1800, showConfirmButton: false });
      },
      error: (err) => {
        this.procesandoSolicitud.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.detail || 'Error al rechazar la solicitud', timer: 2200, showConfirmButton: false });
      },
    });
  }

  cancelarRechazoSolicitud(): void {
    this.accionSolicitud.set('idle');
    this.motivoRechazoSolicitud = '';
  }

  // ── Acciones por documento ────────────────────────────────────
  iniciarRechazo(idDocumento: number): void {
    this.rechazandoDoc.set({ ...this.rechazandoDoc(), [idDocumento]: true });
    this.motivoRechazo = { ...this.motivoRechazo, [idDocumento]: '' };
  }

  cancelarRechazo(idDocumento: number): void {
    this.rechazandoDoc.set({ ...this.rechazandoDoc(), [idDocumento]: false });
    this.motivoRechazo = { ...this.motivoRechazo, [idDocumento]: '' };
  }

  aprobarDocumento(idDocumento: number): void {
    const det = this.solicitudDetalle();
    if (!det) return;
    this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: true });

    this.peticionesPersonal.aprobarDocumento(det.id_solicitud, idDocumento, this.idAdmin).subscribe({
      next: () => {
        this.actualizarEstadoDoc(idDocumento, 'APROBADO', null);
        this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: false });
        this.obtenerSolicitudes();
      },
      error: () => {
        this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: false });
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
    const det = this.solicitudDetalle();
    if (!det) return;
    this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: true });

    this.peticionesPersonal.rechazarDocumento(det.id_solicitud, idDocumento, this.idAdmin, motivo).subscribe({
      next: () => {
        this.actualizarEstadoDoc(idDocumento, 'RECHAZADO', motivo);
        this.rechazandoDoc.set({ ...this.rechazandoDoc(), [idDocumento]: false });
        this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: false });
        this.obtenerSolicitudes();
      },
      error: () => {
        this.procesandoDoc.set({ ...this.procesandoDoc(), [idDocumento]: false });
        Swal.fire({ icon: 'error', title: 'Error al rechazar el documento', timer: 1500, showConfirmButton: false });
      },
    });
  }

  private actualizarEstadoDoc(idDocumento: number, estado: 'APROBADO' | 'RECHAZADO', comentario: string | null): void {
    const det = this.solicitudDetalle();
    if (!det) return;
    this.solicitudDetalle.set({
      ...det,
      documentos: det.documentos.map(d =>
        d.id_documento === idDocumento ? { ...d, estado_documento: estado, comentario_admin: comentario } : d
      ),
    });
  }

  // ── Sprint 5: Paso 3 — Generar documento (constancia / tarjetón) ──

  aceptarSolicitudFinal(): void {
    const det = this.solicitudDetalle();
    if (!det) return;

    if (!this.mesesVigencia || this.mesesVigencia < 1 || this.mesesVigencia > 24) {
      Swal.fire({ icon: 'warning', title: 'Ingresa un valor de vigencia válido (1-24 meses).', timer: 2000, showConfirmButton: false });
      return;
    }

    this.procesandoAceptar.set(true);

    this.adminService.aceptarSolicitud(det.id_solicitud, {
      id_admin: this.idAdmin,
      meses_vigencia: this.mesesVigencia,
    }).subscribe({
      next: (resp) => {
        this.documentoGenerado.set(resp);
        this.procesandoAceptar.set(false);
        this.obtenerSolicitudes();
        Swal.fire({
          icon: 'success',
          title: '¡Documento generado!',
          text: `Folio: ${resp.folio} — Se envió el correo al alumno.`,
          timer: 3000,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.procesandoAceptar.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.detail || 'Error al generar el documento', timer: 2500, showConfirmButton: false });
      },
    });
  }

  descargarPDF(qrToken: string): void {
    const url = this.adminService.getUrlDescargaDocumento(qrToken);
    window.open(url, '_blank');
  }

  // ── Helpers ───────────────────────────────────────────────────
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
