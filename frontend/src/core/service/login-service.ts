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

  login(username: string): Observable<loginResponse> {
    return this.http
      .post<loginResponse>(`${this.API_URL}/login?numero_cuenta=${username}`, {})
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
          const { rol } = response;
          localStorage.setItem('numeroCuenta', username);
          localStorage.setItem('rolUsuario', rol);
          if (response.id_admin) {
            localStorage.setItem('idAdmin', String(response.id_admin));
          }
        }),
        catchError((error) => {
          Swal.fire({
            position: 'center',
            icon: 'error',
            title: `${error.detail}`,
            showConfirmButton: false,
            timer: 1500,
          });
          return throwError(() => new Error('Error en el login'));
        }),
      );
  }
}
