import { Component, OnInit } from '@angular/core';
import { UsuarioMock } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  usuarios: UsuarioMock[] = [];
  usuariosFiltrados: UsuarioMock[] = [];
  filtroRol = '';

  roles = ['ADMIN', 'REVISOR', 'VIGILANTE'];

  ngOnInit() {
    this.usuarios = [
      { id: 1, nombre: 'Administrador Propietario', correo: 'admin@cuut.mx', rol: 'ADMIN', estado: 'Activo', ultimoAcceso: '2026-06-24 14:30' },
      { id: 2, nombre: 'Personal 1 Docente', correo: 'personal1@cuut.mx', rol: 'REVISOR', estado: 'Activo', ultimoAcceso: '2026-06-24 10:15' },
      { id: 3, nombre: 'Guardia 1 Encargado', correo: 'guardia1@cuut.mx', rol: 'VIGILANTE', estado: 'Activo', ultimoAcceso: '2026-06-23 18:45' },
      { id: 4, nombre: 'María López Hernández', correo: 'mlopez@cuut.mx', rol: 'REVISOR', estado: 'Inactivo', ultimoAcceso: '2026-06-20 09:00' },
      { id: 5, nombre: 'Carlos Ramírez Torres', correo: 'cramirez@cuut.mx', rol: 'VIGILANTE', estado: 'Activo', ultimoAcceso: '2026-06-24 07:30' },
    ];
    this.usuariosFiltrados = [...this.usuarios];
  }

  filtrarPorRol() {
    if (this.filtroRol) {
      this.usuariosFiltrados = this.usuarios.filter((u) => u.rol === this.filtroRol);
    } else {
      this.usuariosFiltrados = [...this.usuarios];
    }
  }

  getRolTexto(rol: string): string {
    const mapa: Record<string, string> = {
      ADMIN: 'Administrador',
      REVISOR: 'Personal Operativo',
      VIGILANTE: 'Guardia',
    };
    return mapa[rol] || rol;
  }

  getEstadoClase(estado: string): string {
    return estado === 'Activo' ? 'badge--success' : 'badge--muted';
  }
}
