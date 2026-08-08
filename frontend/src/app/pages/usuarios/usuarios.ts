import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { UsuarioSistema } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  usuarios: UsuarioSistema[] = [];
  cargando = true;

  filtroBusqueda = '';
  filtroRol = '';
  filtroEstado = '';

  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;

  roles = ['ALUMNO', 'ADMIN', 'REVISOR', 'VIGILANTE'];

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarUsuarios(1);
  }

  cargarUsuarios(page: number) {
    this.cargando = true;
    this.adminService
      .listarUsuarios({
        rol: this.filtroRol || undefined,
        estado_activo: this.filtroEstado === '' ? undefined : this.filtroEstado === 'activo',
        busqueda: this.filtroBusqueda.trim() || undefined,
        page,
      })
      .subscribe({
        next: (res) => {
          this.usuarios = res.resultados;
          this.paginaActual = res.pagina_actual;
          this.totalPaginas = res.total_paginas;
          this.totalRegistros = res.total_registros;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargando = false;
          this.cdr.detectChanges();
        },
      });
  }

  aplicarFiltros() {
    this.cargarUsuarios(1);
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.cargarUsuarios(1);
  }

  paginaAnterior() {
    if (this.paginaActual > 1) this.cargarUsuarios(this.paginaActual - 1);
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) this.cargarUsuarios(this.paginaActual + 1);
  }

  getRolTexto(rol: string): string {
    const mapa: Record<string, string> = {
      ALUMNO: 'Alumno',
      ADMIN: 'Administrador',
      REVISOR: 'Personal Operativo',
      VIGILANTE: 'Guardia',
    };
    return mapa[rol] || rol;
  }

  getEstadoClase(activo: boolean): string {
    return activo ? 'badge--success' : 'badge--muted';
  }
}
