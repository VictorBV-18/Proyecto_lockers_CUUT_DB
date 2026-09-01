import { Injectable, signal } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ContadorNoLeidasResponse, NotificacionesResponse } from '../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
    private API_URL = environment.apiUrl;

    public noLeidas = signal<number>(0);

    constructor(private http: HttpClient) {}


    notificaciones(numeroCuenta: string, rol: string, page: number = 1): Observable<NotificacionesResponse> {
      return this.http.get<NotificacionesResponse>(`${this.API_URL}/notificaciones/${numeroCuenta}?rol=${rol}&page=${page}`).pipe(
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }

    notificacionLeida(idNotificacion: number, numeroCuenta: string): Observable<any> {
      return this.http.put<any>(`${this.API_URL}/notificaciones/${idNotificacion}/leer`, {
        numero_cuenta: numeroCuenta,
      }).pipe(
        tap(() => this.noLeidas.set(Math.max(0, this.noLeidas() - 1))),
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }

    marcarTodasLeidas(numeroCuenta: string, rol: string): Observable<any> {
      return this.http.put<any>(`${this.API_URL}/notificaciones/${numeroCuenta}/leer-todas?rol=${rol}`, {}).pipe(
        tap(() => this.noLeidas.set(0)),
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }

    contarNoLeidas(numeroCuenta: string, rol: string): Observable<ContadorNoLeidasResponse> {
      return this.http.get<ContadorNoLeidasResponse>(`${this.API_URL}/notificaciones/${numeroCuenta}/no-leidas?rol=${rol}`).pipe(
        tap((response) => this.noLeidas.set(response.no_leidas)),
        catchError((error) => {
           return throwError(() => error);
        })
      )
    }
}
