import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, tap } from 'rxjs/operators';
import {
  MiSolicitudResponse,
  NuevaSolcitudResponse,
  NuevaSolicitudPayload,
  NuevaSolicitudResponse,
  SolicitudResumen,
} from '../interfaces/interfaces';
import { environment } from '../../environment/environment';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

/* 
const HISTORIAL_INICIAL: SolicitudResumen[] = [
{ id: '1', tipo: 'Permiso de Estacionamiento', folio: 'SOL-2026-0142', fecha: '08/06/2026', estado: 'en_revision' },
{ id: '2', tipo: 'Obtención de Locker',        folio: 'SOL-2026-0098', fecha: '02/06/2026', estado: 'aprobada'    },
  { id: '3', tipo: 'Permiso de Estacionamiento', folio: 'SOL-2025-0871', fecha: '14/12/2025', estado: 'rechazada'   },
];
*/

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  private API_URL = environment.apiUrl;

  public misSolicitudes = signal<SolicitudResumen[]>([]);

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

  editarSolicitud(): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/editar-solicitud}`, {}).pipe(
      tap(() => console.log('Solicitud editada exitosamente')),
      catchError((error) => {
        this.peticionError(error);
        return throwError(() => new Error('Error al editar la solicitud'));
      }),
    );
  }

  guardarBorrador(payload: NuevaSolicitudPayload): Observable<{ ok: true }> {
    return of({ ok: true as const }).pipe(delay(250));
  }

  listarMisSolicitudes(numeroCuenta: string): Observable<MiSolicitudResponse> {
    return this.http.get<MiSolicitudResponse>(`${this.API_URL}/solicitudes/${numeroCuenta}`).pipe(
      tap((response) => {
        const { solicitudes } = response;
        this.misSolicitudes.set(solicitudes);
        console.log('Solicitudes obtenidas:', response);
      }),
      catchError((error) => {
        this.peticionError(error);
        return throwError(() => new Error('Error al obtener las solicitudes'));
      }),
    );
  }

  documentosSolicitados(numeroCuenta: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/documentos-solicitados/`);
  }
}
