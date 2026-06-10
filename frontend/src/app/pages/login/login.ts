import { Component } from '@angular/core';
import { Router } from '@angular/router';

const ROLES_VALIDOS = ['alumno', 'personal', 'administrador', 'guardia'];

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  numeroCuenta = '';
  password     = '';
  mostrarPassword = false;

  constructor(private router: Router) {}

  async login() {
    if (!this.numeroCuenta || !this.password) {
      alert('Por favor, complete todos los campos');
      return;
    }
        
        this.router.navigate(['/home']);


        /* 
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/login/?numero_cuenta=${this.numeroCuenta}`,
        { password: this.password },
      );

      const { rol, mensaje } = response.data;

      if (ROLES_VALIDOS.includes(rol)) {
        localStorage.setItem('cuentaUsuario', this.numeroCuenta);
        localStorage.setItem('rolUsuario', rol);
        this.router.navigate(['/home']);
      } else {
        alert(mensaje || 'Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Error al conectar con el servidor', error);
      alert('No se pudo conectar con el servidor. Por favor, intente más tarde.');
    }
    */
  }
  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }
}
