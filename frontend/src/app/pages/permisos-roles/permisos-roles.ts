import { Component, OnInit } from '@angular/core';

interface UsuarioRol {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  habilitado: boolean;
}

@Component({
  selector: 'app-permisos-roles',
  standalone: false,
  templateUrl: './permisos-roles.html',
  styleUrl: './permisos-roles.css',
})
export class PermisosRoles implements OnInit {
  usuarios: UsuarioRol[] = [];

  mostrarModal = false;
  usuarioSeleccionado: UsuarioRol | null = null;
  nuevoRol = '';
  nuevoEstado = true;

  roles = ['ADMIN', 'REVISOR', 'VIGILANTE'];

  ngOnInit() {
    this.usuarios = [
      { id: 1, nombre: 'Administrador Propietario', correo: 'admin@cuut.mx', rol: 'ADMIN', habilitado: true },
      { id: 2, nombre: 'Personal 1 Docente', correo: 'personal1@cuut.mx', rol: 'REVISOR', habilitado: true },
      { id: 3, nombre: 'Guardia 1 Encargado', correo: 'guardia1@cuut.mx', rol: 'VIGILANTE', habilitado: true },
      { id: 4, nombre: 'María López Hernández', correo: 'mlopez@cuut.mx', rol: 'REVISOR', habilitado: false },
      { id: 5, nombre: 'Carlos Ramírez Torres', correo: 'cramirez@cuut.mx', rol: 'VIGILANTE', habilitado: true },
    ];
  }

  getRolTexto(rol: string): string {
    const mapa: Record<string, string> = {
      ADMIN: 'Administrador',
      REVISOR: 'Personal Operativo',
      VIGILANTE: 'Guardia',
    };
    return mapa[rol] || rol;
  }

  abrirModal(usuario: UsuarioRol) {
    this.usuarioSeleccionado = usuario;
    this.nuevoRol = usuario.rol;
    this.nuevoEstado = usuario.habilitado;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.usuarioSeleccionado = null;
  }

  guardarCambios() {
    if (this.usuarioSeleccionado) {
      const idx = this.usuarios.findIndex((u) => u.id === this.usuarioSeleccionado!.id);
      if (idx >= 0) {
        this.usuarios[idx].rol = this.nuevoRol;
        this.usuarios[idx].habilitado = this.nuevoEstado;
      }
    }
    this.cerrarModal();
  }
}
