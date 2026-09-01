import { Component, HostListener, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../../core/service/admin-service';
import { RegistroAccesoAuditoria } from '../../../core/interfaces/admin-interfaces';
import { descargarBlob, formatearFecha } from '../../../helpers/helpers';
import Swal from 'sweetalert2';

interface MenuAbierto {
  registro: RegistroAccesoAuditoria;
  top: number;
  left: number;
}

@Component({
  selector: 'app-auditoria',
  standalone: false,
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria implements OnInit {
  // Signals: se reflejan en la vista de inmediato sin depender de zone.js,
  // igual que en solicitudes.ts.
  registros = signal<RegistroAccesoAuditoria[]>([]);
  registrosFiltrados = signal<RegistroAccesoAuditoria[]>([]);
  cargando = signal(false);
  exportando = signal(false);

  // Menú de acciones (ícono de 3 puntos) por fila.
  menuAbierto = signal<MenuAbierto | null>(null);

  // Card de detalle: motivo y evidencia de un acceso denegado.
  registroDetalle = signal<RegistroAccesoAuditoria | null>(null);

  // Filtros
  filtroBusqueda = '';
  filtroEstado = '';
  filtroFecha = '';

  estados = ['PERMITIDO', 'DENEGADO'];

  constructor(
    private adminService: AdminService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.cargando.set(true);
    this.obtenerPaginaDeAuditoria(1, []);
  }

  private obtenerPaginaDeAuditoria(page: number, acumulado: RegistroAccesoAuditoria[]): void {
    this.adminService.obtenerAuditoriaAccesos(page).subscribe({
      next: (respuesta) => {
        const combinado = [...acumulado, ...respuesta.resultados];
        if (page < respuesta.total_paginas) {
          this.obtenerPaginaDeAuditoria(page + 1, combinado);
          return;
        }
        this.registros.set(combinado);
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  aplicarFiltros() {
    let resultado = [...this.registros()];

    if (this.filtroBusqueda.trim()) {
      const busq = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(
        (r) =>
          r.guardia_turno.toLowerCase().includes(busq) ||
          r.alumno.nombre.toLowerCase().includes(busq) ||
          r.alumno.numero_cuenta.toLowerCase().includes(busq) ||
          r.tramite.toLowerCase().includes(busq)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter((r) => r.estado_acceso === this.filtroEstado);
    }

    if (this.filtroFecha) {
      resultado = resultado.filter((r) => r.fecha_hora.startsWith(this.filtroFecha));
    }

    this.registrosFiltrados.set(resultado);
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroEstado = '';
    this.filtroFecha = '';
    this.aplicarFiltros();
  }

  exportarPDF() {
    // Placeholder — pendiente de implementación con endpoint de auditoría
    alert('Exportar PDF estará disponible cuando se implemente el endpoint de auditoría.');
  }

  exportarExcel() {
    this.exportando.set(true);
    this.adminService.exportarAuditoriaAccesosExcel().subscribe({
      next: (blob) => {
        descargarBlob(blob, 'Registro_de_auditoria_accesos_CUUT.xlsx');
        this.exportando.set(false);
      },
      error: () => {
        this.exportando.set(false);
        Swal.fire({
          icon: 'error',
          title: 'No se pudo generar el archivo Excel.',
          timer: 2200,
          showConfirmButton: false,
        });
      },
    });
  }

  getEstadoClase(estado: string): string {
    return estado === 'PERMITIDO' ? 'badge--success' : 'badge--danger';
  }

  // ── Menú de acciones (3 puntos) ─────────────────────────────────
  toggleMenu(evento: MouseEvent, registro: RegistroAccesoAuditoria) {
    evento.stopPropagation();

    if (this.menuAbierto()?.registro.id_acceso === registro.id_acceso) {
      this.menuAbierto.set(null);
      return;
    }

    const boton = evento.currentTarget as HTMLElement;
    const rect = boton.getBoundingClientRect();
    this.menuAbierto.set({
      registro,
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 200,
    });
  }

  @HostListener('document:click')
  cerrarMenu() {
    this.menuAbierto.set(null);
  }

  // ── Card de detalle: motivo y evidencia ─────────────────────────
  abrirDetalle(registro: RegistroAccesoAuditoria) {
    this.menuAbierto.set(null);
    this.registroDetalle.set(registro);
  }

  cerrarDetalle() {
    this.registroDetalle.set(null);
  }

  urlEvidencia(idAcceso: number): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      this.adminService.obtenerUrlEvidenciaAcceso(idAcceso),
    );
  }

  formatearFechaHora(fechaHora: string): string {
    const fecha = formatearFecha(fechaHora);
    const parteHora = fechaHora.split(/[T ]/)[1];
    const hora = parteHora ? parteHora.slice(0, 5) : '';
    return hora ? `${fecha}, ${hora}` : fecha;
  }
}
