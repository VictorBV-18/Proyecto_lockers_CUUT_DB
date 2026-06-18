import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../../core/service/login-service';
import Swal from 'sweetalert2';

const ROLES_VALIDOS = ['alumno', 'personal', 'administrador', 'guardia'];

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  numeroCuenta = '';
  password = '';
  mostrarPassword = false;

  constructor(private router: Router) {}

  loginUser = inject(LoginService);

  verificateLogin() {
    if (!this.numeroCuenta || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, complete todos los campos',
      });
      return;
    }
    this.loginUser.login(this.numeroCuenta).subscribe();
  }
  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }
}
