import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { AdminService } from '../../../core/service/admin-service';
import {
  CARRERAS_VALIDAS,
  CrearAlumnoPayload,
  CrearPersonalPayload,
  TipoCuentaNueva,
} from '../../../core/interfaces/admin-interfaces';

interface TipoCuentaOpcion {
  valor: TipoCuentaNueva;
  label: string;
}

const DOMINIOS_ALUMNO = ['@alumno.uaemex.mx', '@uaemex.mx'];
const DOMINIOS_PERSONAL = ['@profesor.uaemex.mx', '@uaemex.mx', '@cuut.mx'];

@Component({
  selector: 'app-crear-cuentas',
  standalone: false,
  templateUrl: './crear-cuentas.html',
  styleUrl: './crear-cuentas.css',
})
export class CrearCuentas {
  tiposCuenta: TipoCuentaOpcion[] = [
    { valor: 'ADMIN', label: 'Administrador' },
    { valor: 'REVISOR', label: 'Personal Operativo' },
    { valor: 'ALUMNO', label: 'Alumno' },
    { valor: 'VIGILANTE', label: 'Guardia' },
  ];

  carreras = CARRERAS_VALIDAS;

  tipoCuenta: TipoCuentaNueva = 'ADMIN';

  numeroCuenta = '';
  nombre = '';
  apellidos = '';
  correo = '';
  carrera = '';
  contrasenaGenerada = '';
  mostrarContrasena = false;

  enviando = false;

  constructor(private adminService: AdminService) {}

  seleccionarTipo(tipo: TipoCuentaNueva) {
    this.tipoCuenta = tipo;
    if (tipo !== 'ALUMNO') this.carrera = '';
  }

  generarContrasena() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let resultado = '';
    for (let i = 0; i < 10; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    this.contrasenaGenerada = resultado;
    this.mostrarContrasena = true;
  }

  copiarContrasena() {
    if (!this.contrasenaGenerada) return;
    navigator.clipboard?.writeText(this.contrasenaGenerada);
  }

  correoRequerido(): boolean {
    return this.tipoCuenta !== 'VIGILANTE';
  }

  formularioValido(): boolean {
    if (!this.numeroCuenta.trim() || !this.nombre.trim() || !this.apellidos.trim()) {
      return false;
    }
    if (this.correoRequerido() && !this.correo.trim()) return false;
    if (!this.contrasenaGenerada) return false;
    if (this.tipoCuenta === 'ALUMNO' && !this.carrera.trim()) return false;
    return true;
  }

  private dominioValido(correo: string): boolean {
    const dominios = this.tipoCuenta === 'ALUMNO' ? DOMINIOS_ALUMNO : DOMINIOS_PERSONAL;
    return dominios.some((d) => correo.toLowerCase().endsWith(d));
  }

  crearCuenta() {
    if (!this.formularioValido()) {
      Swal.fire({
        icon: 'warning',
        title: 'Completa todos los campos requeridos y genera una contraseña.',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const correo = this.correo.trim();
    if (correo && !this.dominioValido(correo)) {
      const dominios = this.tipoCuenta === 'ALUMNO' ? DOMINIOS_ALUMNO : DOMINIOS_PERSONAL;
      Swal.fire({
        icon: 'warning',
        title: `El correo debe ser institucional (${dominios.join(', ')}).`,
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    this.enviando = true;

    if (this.tipoCuenta === 'ALUMNO') {
      const payload: CrearAlumnoPayload = {
        numero_cuenta: this.numeroCuenta.trim(),
        nombre: this.nombre.trim(),
        apellidos: this.apellidos.trim(),
        correo_electronico: correo,
        contrasena: this.contrasenaGenerada,
        carrera: this.carrera,
      };
      this.adminService.crearCuentaAlumno(payload).subscribe({
        next: () => this.onCuentaCreada(),
        error: (err) => this.onErrorCrear(err),
      });
      return;
    }

    const payload: CrearPersonalPayload = {
      numero_cuenta: this.numeroCuenta.trim(),
      nombre: this.nombre.trim(),
      apellidos: this.apellidos.trim(),
      contrasena: this.contrasenaGenerada,
      rol: this.tipoCuenta,
      correo_electronico: correo || undefined,
    };
    this.adminService.crearCuentaPersonal(payload).subscribe({
      next: () => this.onCuentaCreada(),
      error: (err) => this.onErrorCrear(err),
    });
  }

  private onCuentaCreada() {
    this.enviando = false;
    Swal.fire({
      icon: 'success',
      title: `Cuenta creada para ${this.nombre.trim()} ${this.apellidos.trim()}`,
      text: 'Comparte la contraseña generada, no se mostrará de nuevo.',
      timer: 2500,
      showConfirmButton: false,
    });
    this.resetFormulario();
  }

  private onErrorCrear(err: any) {
    this.enviando = false;
    Swal.fire({
      icon: 'error',
      title: err?.error?.detail || 'No se pudo crear la cuenta.',
      timer: 3000,
      showConfirmButton: false,
    });
  }

  resetFormulario() {
    this.numeroCuenta = '';
    this.nombre = '';
    this.apellidos = '';
    this.correo = '';
    this.carrera = '';
    this.contrasenaGenerada = '';
    this.mostrarContrasena = false;
  }

  getTipoLabel(tipo: TipoCuentaNueva): string {
    return this.tiposCuenta.find((t) => t.valor === tipo)?.label || tipo;
  }
}
