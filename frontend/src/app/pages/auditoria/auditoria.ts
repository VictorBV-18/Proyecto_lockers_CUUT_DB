import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { RegistroAccesoAuditoria } from '../../../core/interfaces/admin-interfaces';
import { descargarBlob, formatearFecha } from '../../../helpers/helpers';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-auditoria',
  standalone: false,
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria implements OnInit {
  registros: RegistroAccesoAuditoria[] = [];
  registrosFiltrados: RegistroAccesoAuditoria[] = [];
  cargando = false;
  exportando = false;

  // Filtros
  filtroBusqueda = '';
  filtroEstado = '';
  filtroFecha = '';

  estados = ['PERMITIDO', 'DENEGADO'];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.cargando = true;
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
        this.registros = combinado;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  aplicarFiltros() {
    let resultado = [...this.registros];

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

    this.registrosFiltrados = resultado;
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
    this.exportando = true;
    this.adminService.exportarAuditoriaAccesosExcel().subscribe({
      next: (blob) => {
        descargarBlob(blob, 'Registro_de_auditoria_accesos_CUUT.xlsx');
        this.exportando = false;
      },
      error: () => {
        this.exportando = false;
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

  formatearFechaHora(fechaHora: string): string {
    const fecha = formatearFecha(fechaHora);
    const parteHora = fechaHora.split(/[T ]/)[1];
    const hora = parteHora ? parteHora.slice(0, 5) : '';
    return hora ? `${fecha}, ${hora}` : fecha;
  }
}
