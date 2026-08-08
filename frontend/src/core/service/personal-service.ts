import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { catchError, Observable, tap, throwError } from 'rxjs';
import {
  Solicitud,
  Solicitudes,
  SolicitudDetalleRevisor,
  validarDocumento,
  documentoResponse,
} from '../interfaces/personalinterfaces';

@Injectable({
  providedIn: 'root',
})
export class PersonalService {
  private API_URL = environment.apiUrl;

  public todasLasSolicitudes = signal<Solicitud[]>([]);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // El backend regresa las solicitudes paginadas de 20 en 20.
  listarSolicitudes(page: number = 1): Observable<Solicitudes> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Solicitudes>(`${this.API_URL}/solicitudes/`, { params }).pipe(
      catchError((error) => {
        return throwError(() => new Error('Error al obtener las solicitudes'));
      }),
    );
  }

  // Recorre todas las páginas del backend y acumula el resultado en el signal,
  // para conservar el filtrado en cliente sobre la lista completa.
  cargarTodasLasSolicitudes(): void {
    this.obtenerPaginaDeSolicitudes(1, []);
  }

  private obtenerPaginaDeSolicitudes(page: number, acumulado: Solicitud[]): void {
    this.listarSolicitudes(page).subscribe({
      next: (response) => {
        const combinado = [...acumulado, ...response.resultados];
        this.todasLasSolicitudes.set(combinado);
        if (page < response.total_paginas) {
          this.obtenerPaginaDeSolicitudes(page + 1, combinado);
        }
      },
      error: () => {},
    });
  }

  //valida documento por documento
  validarDocumentosSolicitados(payload: validarDocumento): Observable<documentoResponse> {
    return this.http
      .put<documentoResponse>(
        `${this.API_URL}/solicitudes/${payload.id_solicitud}/documentos/${payload.id_documento}`,
        payload,
      )
      .pipe(
        tap((response) => {
          console.log(response);
        }),
      );
  }

  //Rechaza toda la solicitud
  rechazoTotalDocumentos(payload: validarDocumento): Observable<any> {
    return this.http
      .post<any>(`${this.API_URL}/solicitudes/${payload.id_solicitud}/rechazar`, payload)
      .pipe(
        tap((response) => {
          console.log(response);
        }),
      );
  }

  // Devuelve la URL para previsualizar (inline) el documento subido por el alumno.
  // El propio <img>/<iframe> hace el GET directamente, no pasa por HttpClient.
  obtenerUrlDocumento(idDocumento: number): string {
    return `${this.API_URL}/solicitudes/documentos/${idDocumento}/visualizar`;
  }

  obtenerDetalleSolicitud(idSolicitud: number): Observable<SolicitudDetalleRevisor> {
    return this.http
      .get<SolicitudDetalleRevisor>(`${this.API_URL}/solicitudes/${idSolicitud}/detalle`)
      .pipe(
        catchError((error) => {
          return throwError(() => new Error('Error al obtener el detalle de la solicitud'));
        }),
      );
  }

  aprobarDocumento(idSolicitud: number, idDocumento: number, idAdmin: number): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/solicitudes/${idSolicitud}/documentos/${idDocumento}`,
      { id_admin: idAdmin, estado: 'APROBADO', comentario: null },
    );
  }

  rechazarDocumento(
    idSolicitud: number,
    idDocumento: number,
    idAdmin: number,
    comentario: string,
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/solicitudes/${idSolicitud}/documentos/${idDocumento}`,
      { id_admin: idAdmin, estado: 'RECHAZADO', comentario },
    );
  }
}
