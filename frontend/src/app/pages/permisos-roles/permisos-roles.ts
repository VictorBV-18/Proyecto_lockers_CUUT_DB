import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { AdminService } from '../../../core/service/admin-service';
import { AccesoDenegadoHistorial, UsuarioSistema } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-permisos-roles',
  standalone: false,
  templateUrl: './permisos-roles.html',
  styleUrl: './permisos-roles.css',
})
export class PermisosRoles implements OnInit {
  usuarios: UsuarioSistema[] = [];
  cargando = true;

  filtroBusqueda = '';
  filtroRol = '';

  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;

  roles = ['ADMIN', 'REVISOR', 'VIGILANTE'];

  mostrarModal = false;
  usuarioSeleccionado: UsuarioSistema | null = null;
  nuevoRol = '';
  nuevoEstado = true;
  guardando = false;

  // ── Apelación de bloqueo por accesos denegados (3 strikes) ──
  mostrarModalApelacion = false;
  usuarioApelacion: UsuarioSistema | null = null;
  historialDenegados: AccesoDenegadoHistorial[] = [];
  cargandoHistorial = false;
  comentarioDesbloqueo = '';
  desbloqueando = false;
  evidenciaPreview: SafeResourceUrl | null = null;

  private idAdmin = Number(localStorage.getItem('idAdmin')) || 0;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.cargarUsuarios(1);
  }

  cargarUsuarios(page: number) {
    this.cargando = true;
    this.adminService
      .listarUsuarios({
        rol: this.filtroRol || undefined,
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

  puedeEditarRol(usuario: UsuarioSistema): boolean {
    return usuario.rol !== 'ALUMNO';
  }

  abrirModal(usuario: UsuarioSistema) {
    this.usuarioSeleccionado = usuario;
    this.nuevoRol = usuario.rol;
    this.nuevoEstado = usuario.estado_activo;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.usuarioSeleccionado = null;
  }

  guardarCambios() {
    const usuario = this.usuarioSeleccionado;
    if (!usuario) return;

    const peticiones: Observable<any>[] = [];

    if (this.nuevoEstado !== usuario.estado_activo) {
      peticiones.push(
        this.adminService.cambiarEstadoUsuario({
          numero_cuenta: usuario.numero_cuenta,
          estado_activo: this.nuevoEstado,
        })
      );
    }

    if (this.puedeEditarRol(usuario) && this.nuevoRol !== usuario.rol) {
      peticiones.push(
        this.adminService.cambiarRolUsuario({
          numero_cuenta: usuario.numero_cuenta,
          nuevo_rol: this.nuevoRol,
        })
      );
    }

    if (peticiones.length === 0) {
      this.cerrarModal();
      return;
    }

    this.guardando = true;
    forkJoin(peticiones).subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarModal();
        Swal.fire({
          icon: 'success',
          title: 'Cambios guardados correctamente',
          timer: 2000,
          showConfirmButton: false,
        });
        this.cargarUsuarios(this.paginaActual);
      },
      error: (err) => {
        this.guardando = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: err?.error?.detail || 'No se pudieron guardar los cambios.',
          timer: 3000,
          showConfirmButton: false,
        });
      },
    });
  }

  // ── Apelación de bloqueo por accesos denegados (3 strikes) ──

  abrirApelacion(usuario: UsuarioSistema) {
    this.usuarioApelacion = usuario;
    this.mostrarModalApelacion = true;
    this.cargandoHistorial = true;
    this.historialDenegados = [];
    this.comentarioDesbloqueo = '';
    this.evidenciaPreview = null;

    this.adminService.consultarEvidenciasApelacion(usuario.numero_cuenta).subscribe({
      next: (resp) => {
        this.historialDenegados = resp.historial_denegados;
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarApelacion() {
    this.mostrarModalApelacion = false;
    this.usuarioApelacion = null;
    this.historialDenegados = [];
    this.comentarioDesbloqueo = '';
    this.evidenciaPreview = null;
  }

  verEvidencia(registro: AccesoDenegadoHistorial) {
    if (!registro.evidencia) return;
    const url = this.adminService.obtenerUrlEvidenciaAcceso(registro.id_acceso);
    this.evidenciaPreview = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  cerrarPreviewEvidencia() {
    this.evidenciaPreview = null;
  }

  desbloquearAcceso() {
    const usuario = this.usuarioApelacion;
    if (!usuario) return;

    const comentario = this.comentarioDesbloqueo.trim();
    if (!comentario) {
      Swal.fire({
        icon: 'warning',
        title: 'Ingresa un comentario para justificar el desbloqueo.',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    this.desbloqueando = true;
    this.adminService
      .desbloquearAccesoAlumno(usuario.numero_cuenta, { id_admin: this.idAdmin, comentario })
      .subscribe({
        next: (resp) => {
          this.desbloqueando = false;
          this.cerrarApelacion();
          Swal.fire({ icon: 'success', title: resp.mensaje, timer: 2800, showConfirmButton: false });
          this.cargarUsuarios(this.paginaActual);
        },
        error: (err) => {
          this.desbloqueando = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'error',
            title: err?.error?.detail || 'No se pudo desbloquear al alumno.',
            timer: 3000,
            showConfirmButton: false,
          });
        },
      });
  }
}
