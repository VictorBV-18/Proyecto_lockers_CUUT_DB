import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { SolicitudAdmin } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-solicitudes',
  standalone: false,
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class Solicitudes implements OnInit {
  solicitudes: SolicitudAdmin[] = [];
  solicitudesFiltradas: SolicitudAdmin[] = [];

  // Filtros
  filtroBusqueda = '';
  filtroEstado = '';
  filtroFecha = '';

  // Modal cancelar
  mostrarModalCancelar = false;
  solicitudSeleccionada: SolicitudAdmin | null = null;
  motivoCancelacion = '';
  errorMotivo = false;

  estados = ['PENDIENTE', 'APROBADA', 'DOCUMENTACION_INCORRECTA', 'EN_REVISION'];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes() {
    this.adminService.obtenerTodasSolicitudes().subscribe({
      next: (res) => {
        this.solicitudes = res.solicitudes;
        this.aplicarFiltros();
      },
      error: (err) => console.error('Error cargando solicitudes:', err),
    });
  }

  aplicarFiltros() {
    let resultado = [...this.solicitudes];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(
        (s) =>
          s.nombre_completo.toLowerCase().includes(busqueda) ||
          s.numero_cuenta.includes(busqueda) ||
          s.folio.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter((s) => s.estado === this.filtroEstado);
    }

    if (this.filtroFecha) {
      resultado = resultado.filter((s) => {
        const fechaSolicitud = new Date(s.fecha_solicitud).toISOString().split('T')[0];
        return fechaSolicitud === this.filtroFecha;
      });
    }

    this.solicitudesFiltradas = resultado;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroEstado = '';
    this.filtroFecha = '';
    this.aplicarFiltros();
  }

  getEstadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'badge--warning',
      APROBADA: 'badge--success',
      DOCUMENTACION_INCORRECTA: 'badge--danger',
      RECHAZADA: 'badge--danger',
      EN_REVISION: 'badge--info',
    };
    return mapa[estado] || 'badge--muted';
  }

  getEstadoTexto(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADA: 'Aprobada',
      DOCUMENTACION_INCORRECTA: 'Doc. Incorrecta',
      RECHAZADA: 'Rechazada',
      EN_REVISION: 'En Revisión',
    };
    return mapa[estado] || estado;
  }

  getTramiteTexto(tipo: string): string {
    return tipo === 'locker' ? 'Locker' : 'Estacionamiento';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // ── Modal Cancelar ────────────────────────
  abrirModalCancelar(solicitud: SolicitudAdmin) {
    this.solicitudSeleccionada = solicitud;
    this.motivoCancelacion = '';
    this.errorMotivo = false;
    this.mostrarModalCancelar = true;
  }

  cerrarModalCancelar() {
    this.mostrarModalCancelar = false;
    this.solicitudSeleccionada = null;
    this.motivoCancelacion = '';
    this.errorMotivo = false;
  }

  confirmarCancelacion() {
    if (!this.motivoCancelacion.trim()) {
      this.errorMotivo = true;
      return;
    }
    this.errorMotivo = false;

    if (this.solicitudSeleccionada) {
      this.adminService
        .rechazarSolicitud(this.solicitudSeleccionada.id_solicitud, {
          id_admin: 1,
          motivo: this.motivoCancelacion,
        })
        .subscribe({
          next: () => {
            this.cerrarModalCancelar();
            this.cargarSolicitudes();
          },
          error: (err) => console.error('Error al cancelar:', err),
        });
    }
  }
}
