import { Component } from '@angular/core';
import { TipoCuentaNueva } from '../../../core/interfaces/admin-interfaces';

interface TipoCuentaOpcion {
  valor: TipoCuentaNueva;
  label: string;
}

@Component({
  selector: 'app-crear-cuentas',
  standalone: false,
  templateUrl: './crear-cuentas.html',
  styleUrl: './crear-cuentas.css',
})
export class CrearCuentas {
  tiposCuenta: TipoCuentaOpcion[] = [
    { valor: 'ADMIN', label: 'Administrador' },
    { valor: 'DOCENTE', label: 'Docente' },
    { valor: 'ALUMNO', label: 'Alumno' },
    { valor: 'GUARDIA', label: 'Guardia' },
  ];

  tipoCuenta: TipoCuentaNueva = 'ADMIN';

  numeroCuenta = '';
  nombre = '';
  apellidos = '';
  correo = '';
  carrera = '';
  contrasenaGenerada = '';
  mostrarContrasena = false;

  mensajeExito = '';

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

  formularioValido(): boolean {
    if (!this.numeroCuenta.trim() || !this.nombre.trim() || !this.apellidos.trim() || !this.correo.trim()) {
      return false;
    }
    if (!this.contrasenaGenerada) return false;
    if (this.tipoCuenta === 'ALUMNO' && !this.carrera.trim()) return false;
    return true;
  }

  crearCuenta() {
    if (!this.formularioValido()) {
      alert('Completa todos los campos requeridos y genera una contraseña.');
      return;
    }

    // Diseño front por ahora: no se envía a ningún lado.
    // Falta conectar con el endpoint de creación de cuentas del backend.
    this.mensajeExito = `Cuenta creada para ${this.nombre.trim()} ${this.apellidos.trim()}. Comparte la contraseña generada, no se mostrará de nuevo.`;
    this.resetFormulario();
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
