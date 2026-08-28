import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  CambiarContrasenaPayload,
  CambiarContrasenaResponse,
  FinalizarSolicitudResponse,
  MiSolicitudResponse,
  NuevaSolcitudResponse,
  NuevaSolicitudPayload,
  NuevaSolicitudResponse,
  PerfilAlumnoResponse,
  RecursoActivo,
  SolicitudesDetalladasResponse,
  SolicitudesEstudiante,
} from '../interfaces/interfaces';
import { environment } from '../../environment/environment';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  private API_URL = environment.apiUrl;

  peticionError(error: string) {
    Swal.fire({
      position: 'center',
      icon: 'error',
      title: error,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  peticionSuccess(success : string){
    Swal.fire({
      position: 'center',
      icon: 'success',
      title: success,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  constructor(private http: HttpClient , private router:Router) {}

  public misTramites = signal<SolicitudesEstudiante[]>([])

  crearSolicitud(payload: NuevaSolicitudPayload): Observable<NuevaSolcitudResponse> {
   
    return this.http.post<NuevaSolcitudResponse>(`${this.API_URL}/solicitudes`, payload).pipe(
      tap((response) => {
        this.peticionSuccess(response.mensaje);
      }),
      catchError(({error}) => {
        this.peticionError(error.detail);
        this.router.navigate(["/home/mis-solicitudes"])
        return throwError(() => new Error('Error al crear la solicitud'));
      }),
    );
  }

  subirDocumento(
    idSolicitud: number,
    idTipoDocumento: number,
    archivo: File,
  ): Observable<NuevaSolicitudResponse> {
    const form = new FormData();
    form.append('id_tipo_documento', String(idTipoDocumento));
    form.append('archivo', archivo);

    return this.http
      .post<NuevaSolicitudResponse>(`${this.API_URL}/solicitudes/${idSolicitud}/documentos/`, form)
      .pipe(
        catchError(({ error }) => {
          this.peticionError(error?.detail ?? 'Error al subir el documento');
          return throwError(() => new Error('Error al subir el documento'));
        }),
      );
  }

  finalizarSolicitud(idSolicitud: number): Observable<FinalizarSolicitudResponse> {
    return this.http
      .post<FinalizarSolicitudResponse>(`${this.API_URL}/solicitudes/${idSolicitud}/enviar_solicitud`, {})
      .pipe(
        catchError(({ error }) => {
          this.peticionError(error?.detail ?? 'Error al finalizar la solicitud');
          return throwError(() => new Error('Error al finalizar la solicitud'));
        }),
      );
  }

  listarMisSolicitudes(numeroCuenta: string): Observable<MiSolicitudResponse> {
    return this.http.get<MiSolicitudResponse>(`${this.API_URL}/solicitudes/${numeroCuenta}/general`).pipe(
      tap((response) => {
        const {tramites} = response
        this.misTramites.set(tramites);
      }),
      catchError((error) => {
        this.peticionError(error);
        return throwError(() => new Error('Error al obtener las solicitudes'));
      }),
    );
  }


  obtenerSolicitudesDetalladas(numeroCuenta: string): Observable<SolicitudesDetalladasResponse> {
    return this.http.get<SolicitudesDetalladasResponse>(`${this.API_URL}/solicitudes/${numeroCuenta}`).pipe(
      catchError(({ error }) => {
        this.peticionError(error?.detail ?? 'Error al obtener los documentos');
        return throwError(() => new Error('Error al obtener los documentos'));
      }),
    );
  }

  obtenerRecursoActivo(idSolicitud: number): Observable<RecursoActivo> {
    return this.http
      .get<RecursoActivo>(`${this.API_URL}/solicitudes/${idSolicitud}/recurso-activo`)
      .pipe(
        catchError(({ error }) => {
          this.peticionError(error?.detail ?? 'Error al obtener los datos del recurso');
          return throwError(() => new Error('Error al obtener los datos del recurso'));
        }),
      );
  }

  obtenerPerfilAlumno(numeroCuenta: string): Observable<PerfilAlumnoResponse> {
    return this.http
      .get<PerfilAlumnoResponse>(`${this.API_URL}/alumno/${numeroCuenta}/mi-perfil`)
      .pipe(
        catchError(({ error }) => {
          this.peticionError(error?.detail ?? 'Error al obtener los datos del perfil');
          return throwError(() => new Error('Error al obtener los datos del perfil'));
        }),
      );
  }

  cambiarContrasena(
    numeroCuenta: string,
    payload: CambiarContrasenaPayload,
  ): Observable<CambiarContrasenaResponse> {
    return this.http
      .put<CambiarContrasenaResponse>(`${this.API_URL}/alumno/${numeroCuenta}/contraseña`, payload)
      .pipe(
        catchError(({ error }) => {
          this.peticionError(error?.detail ?? 'Error al cambiar la contraseña');
          return throwError(() => new Error('Error al cambiar la contraseña'));
        }),
      );
  }

  descargarDocumento(qrToken: string): void {
    this.http
      .get(`${this.API_URL}/documentos/descargar/${qrToken}`, { responseType: 'blob' })
      .pipe(
        catchError((error) => {
          this.peticionError(error?.error?.detail ?? 'Error al descargar el comprobante');
          return throwError(() => new Error('Error al descargar el comprobante'));
        }),
      )
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante_${qrToken}.pdf`;
        enlace.click();
        window.URL.revokeObjectURL(url);
      });
  }

}
