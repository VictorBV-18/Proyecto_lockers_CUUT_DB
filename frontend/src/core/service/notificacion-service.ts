import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { NotificacionesResponse } from '../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
    private API_URL = environment.apiUrl;


    constructor(private http: HttpClient) {}


    notificaciones(numeroCuenta: string, rol: string): Observable<NotificacionesResponse> {
      return this.http.get<NotificacionesResponse>(`${this.API_URL}/notificaciones/${numeroCuenta}?rol=${rol}`).pipe(
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }

    notificacionLeida(idNotificacion: number): Observable<any> {
      return this.http.put<any>(`${this.API_URL}/notificaciones/${idNotificacion}/leer`, {}).pipe(
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }
}
