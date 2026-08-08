import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { loginResponse } from '../interfaces/interfaces';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(username: string, password: string): Observable<loginResponse> {
    return this.http
      .post<loginResponse>(`${this.API_URL}/login/`, {
        numero_cuenta: username,
        contrasena: password,
      })
      .pipe(
        tap((response) => {
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: `${response.mensaje}`,
            showConfirmButton: false,
            timer: 1500,
          });
          this.router.navigate(['/home']);
          const { rol, datos_usuario } = response;
          localStorage.setItem('numeroCuenta', username);
          localStorage.setItem('rolUsuario', rol);
          if (datos_usuario) {
            localStorage.setItem('idAdmin', String(datos_usuario.id));
          }
        }),
        catchError((error) => {
          Swal.fire({
            position: 'center',
            icon: 'error',
            title: error?.error?.detail || 'No se pudo iniciar sesión.',
            showConfirmButton: false,
            timer: 2500,
          });
          return throwError(() => new Error('Error en el login'));
        }),
      );
  }
}
