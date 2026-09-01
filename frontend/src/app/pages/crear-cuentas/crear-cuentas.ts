import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { AdminService } from '../../../core/service/admin-service';
import {
  CARRERAS_VALIDAS,
  CrearAlumnoPayload,
  CrearPersonalPayload,
  CrearGuardiaPayload,
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

  // Genera una contraseña de 6 a 12 caracteres que siempre incluye al menos
  // un número y un carácter especial, para que sea más difícil de adivinar.
  generarContrasena() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const numeros = '23456789';
    const especiales = '!@#$%&*';
    const todos = letras + numeros + especiales;

    const longitud = Math.floor(Math.random() * (12 - 6 + 1)) + 6;

    const caracteres = [
      numeros.charAt(Math.floor(Math.random() * numeros.length)),
      especiales.charAt(Math.floor(Math.random() * especiales.length)),
    ];
    for (let i = caracteres.length; i < longitud; i++) {
      caracteres.push(todos.charAt(Math.floor(Math.random() * todos.length)));
    }

    // Fisher-Yates: evita que el número y el carácter especial queden siempre al inicio.
    for (let i = caracteres.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
    }

    this.contrasenaGenerada = caracteres.join('');
    this.mostrarContrasena = true;
  }

  copiarContrasena() {
    if (!this.contrasenaGenerada) return;
    navigator.clipboard?.writeText(this.contrasenaGenerada);
  }

  // El guardia se crea con cuenta y contraseña autogeneradas en el backend, por lo
  // que su correo es la única forma de entregarle las credenciales.
  esGuardia(): boolean {
    return this.tipoCuenta === 'VIGILANTE';
  }

  // Alumno y Guardia reciben una contraseña generada por el backend y enviada
  // por correo; el formulario no debe pedirla ni mostrarla.
  passwordAutogenerada(): boolean {
    return this.tipoCuenta === 'ALUMNO' || this.tipoCuenta === 'VIGILANTE';
  }

  correoRequerido(): boolean {
    return this.tipoCuenta !== 'ADMIN' && this.tipoCuenta !== 'REVISOR';
  }

  formularioValido(): boolean {
    if (!this.nombre.trim() || !this.apellidos.trim()) return false;
    if (this.correoRequerido() && !this.correo.trim()) return false;
    if (!this.esGuardia() && !this.numeroCuenta.trim()) return false;
    if (!this.passwordAutogenerada() && !this.contrasenaGenerada) return false;
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
        title: 'Completa todos los campos requeridos.',
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

    if (this.esGuardia()) {
      const payload: CrearGuardiaPayload = {
        nombre: this.nombre.trim(),
        apellidos: this.apellidos.trim(),
        correo_electronico: correo,
      };
      this.adminService.crearCuentaGuardia(payload).subscribe({
        next: (resp) => this.onCuentaCreada(resp.numero_cuenta_generado),
        error: (err) => this.onErrorCrear(err),
      });
      return;
    }

    if (this.tipoCuenta === 'ALUMNO') {
      const payload: CrearAlumnoPayload = {
        numero_cuenta: this.numeroCuenta.trim(),
        nombre: this.nombre.trim(),
        apellidos: this.apellidos.trim(),
        correo_electronico: correo,
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

  private onCuentaCreada(numeroCuentaGenerado?: string) {
    this.enviando = false;

    let text: string;
    if (numeroCuentaGenerado) {
      text = `Número de cuenta asignado: ${numeroCuentaGenerado}. Las credenciales se enviaron a su correo.`;
    } else if (this.passwordAutogenerada()) {
      text = 'La contraseña se generó automáticamente y se envió a su correo electrónico.';
    } else {
      text = 'Comparte la contraseña generada, no se mostrará de nuevo.';
    }

    Swal.fire({
      icon: 'success',
      title: `Cuenta creada para ${this.nombre.trim()} ${this.apellidos.trim()}`,
      text,
      timer: 3000,
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
