import { HttpClient } from '@angular/common/http';
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

  listarSolicitudes(): Observable<Solicitudes> {
    return this.http.get<Solicitudes>(`${this.API_URL}/solicitudes`).pipe(
      tap((response) => {
        this.todasLasSolicitudes.set(response.solicitudes);
      }),
      catchError((error) => {
        return throwError(() => new Error('Error al editar la solicitud'));
      }),
    );
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
