import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Solicitudes } from '../interfaces/personalinterfaces';

@Injectable({
  providedIn: 'root',
})
export class PersonalService {
    private API_URL = environment.apiUrl;
  constructor(private http: HttpClient , private router:Router) {}

  listarSolicitudes():Observable<Solicitudes>{
    return this.http.get<Solicitudes>(`${this.API_URL}/solicitudes`).pipe(
      tap(response =>{
        console.log(response)
      }),
      catchError((error) =>{
      return throwError(() => new Error('Error al editar la solicitud'));  
      })
    )
  }
  
}
