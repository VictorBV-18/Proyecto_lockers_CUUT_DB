import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  numeroCuenta = '';

  constructor(private http: HttpClient, private router: Router) {}

  ingresar() {
    this.http.post<any>(`http://127.0.0.1:8000/login/?numero_cuenta=${this.numeroCuenta}`, {}).subscribe({
      next: (datos) => {
        if (datos.rol === 'alumno') {
          localStorage.setItem('cuentaUsuario', this.numeroCuenta);
          alert(datos.mensaje);
          this.router.navigate(['/menu']);
        } else {
          alert(datos.mensaje);
        }
      },
      error: (err) => console.error('Error al conectar con el servidor', err)
    });
  }
}
