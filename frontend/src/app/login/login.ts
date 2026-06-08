import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import axios from 'axios';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  numeroCuenta = '';
  password = '';
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  async login() {
    if ([this.numeroCuenta, this.password].includes('')) {
      alert('Por favor, complete todos los campos');
      return;
    }

    try {
      const usuario = await axios.post(
        `http://127.0.0.1:8000/login/?numero_cuenta=${this.numeroCuenta}`,
        {
          password: this.password,
        },
      );

      if (usuario.data.rol === 'alumno') {
        localStorage.setItem('cuentaUsuario', this.numeroCuenta);
        alert("Bienveido ");
        this.router.navigate(['/home']);
      } else {
        alert(usuario.data.mensaje);
      }
    } catch (error) {
      console.error('Error al conectar con el servidor', error);
      alert('No se pudo conectar con el servidor. Por favor, intente más tarde.');
      return;
    }
    
    /* 
    
    this.http
      .post<any>(`http://127.0.0.1:8000/login/?numero_cuenta=${this.numeroCuenta}`, {})
      .subscribe({
        next: (datos) => {
          if (datos.rol === 'alumno') {
            localStorage.setItem('cuentaUsuario', this.numeroCuenta);
            alert(datos.mensaje);
            this.router.navigate(['/home']);
          } else {
            alert(datos.mensaje);
          }
        },
        error: (err) => console.error('Error al conectar con el servidor', err),
      });
    */
  }
}
