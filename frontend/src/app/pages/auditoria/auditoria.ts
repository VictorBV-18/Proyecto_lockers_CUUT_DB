import { Component, OnInit } from '@angular/core';
import { AuditoriaMock } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-auditoria',
  standalone: false,
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria implements OnInit {
  registros: AuditoriaMock[] = [];
  registrosFiltrados: AuditoriaMock[] = [];

  // Filtros
  filtroBusqueda = '';
  filtroAccion = '';
  filtroFecha = '';

  acciones = [
    'LOGIN',
    'LOGOUT',
    'APROBACIÓN',
    'RECHAZO',
    'BAJA_LOCKER',
    'LIBERACION_MASIVA',
    'EDICION_USUARIO',
    'CONFIGURACION',
  ];

  ngOnInit() {
    // Tabla vacía — los datos vendrán del endpoint de auditoría cuando esté disponible
    this.registros = [];
    this.registrosFiltrados = [];
  }

  aplicarFiltros() {
    let resultado = [...this.registros];

    if (this.filtroBusqueda.trim()) {
      const busq = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(
        (r) =>
          r.usuario.toLowerCase().includes(busq) ||
          r.descripcion.toLowerCase().includes(busq) ||
          r.accion.toLowerCase().includes(busq)
      );
    }

    if (this.filtroAccion) {
      resultado = resultado.filter((r) => r.accion === this.filtroAccion);
    }

    if (this.filtroFecha) {
      resultado = resultado.filter((r) => r.fecha.startsWith(this.filtroFecha));
    }

    this.registrosFiltrados = resultado;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroAccion = '';
    this.filtroFecha = '';
    this.aplicarFiltros();
  }

  exportarPDF() {
    // Placeholder — pendiente de implementación con endpoint de auditoría
    alert('Exportar PDF estará disponible cuando se implemente el endpoint de auditoría.');
  }

  exportarExcel() {
    // Placeholder — pendiente de implementación con endpoint de auditoría
    alert('Exportar Excel estará disponible cuando se implemente el endpoint de auditoría.');
  }

  getAccionClase(accion: string): string {
    const mapa: Record<string, string> = {
      LOGIN: 'badge--info',
      LOGOUT: 'badge--muted',
      APROBACIÓN: 'badge--success',
      RECHAZO: 'badge--danger',
      BAJA_LOCKER: 'badge--warning',
      LIBERACION_MASIVA: 'badge--danger',
      EDICION_USUARIO: 'badge--info',
      CONFIGURACION: 'badge--warning',
    };
    return mapa[accion] || 'badge--muted';
  }
}
