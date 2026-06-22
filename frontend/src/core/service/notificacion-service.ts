import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
    private API_URL = environment.apiUrl;
  

    constructor(private http: HttpClient) {}


    notificaciones(numeroCuenta:string):Observable<any>{
      return this.http.get<any>(`${this.API_URL}/notificaciones/${numeroCuenta}`).pipe(
        tap((response) => {

        }),
        catchError((error) =>{
           return throwError(() => new Error('Error: ', error));
        })
      )
    }

    notificacionLeida(idNotificacion:string):Observable<any>{
      return this.http.put<any>(`${this.API_URL}/notificaciones/${idNotificacion}`,{}).pipe(
        tap((response) =>{
          
        }),
        catchError((err) =>{
           return throwError(() => new Error('Error', err));
        })
      )
    }
}
