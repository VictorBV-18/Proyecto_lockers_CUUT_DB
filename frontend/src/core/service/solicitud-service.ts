import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, tap } from 'rxjs/operators';
import { MiSolicitudResponse, NuevaSolicitudPayload, SolicitudResumen } from '../interfaces/interfaces';
import { environment } from '../../environment/environment';


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

  constructor(private http: HttpClient) {}

  crearSolicitud(payload: NuevaSolicitudPayload): Observable<{ folio: string }> {
    const folio = `SOL-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
    return this.http.post<{ folio: string }>(`${this.API_URL}/solicitudes`, payload).pipe(
      tap(()=> {

      }),
      catchError((error) => {
        console.error('Error al crear la solicitud:', error);
        return throwError(() => new Error('Error al crear la solicitud'));
      })
    );
  }


  editarSolicitud():Observable<any>{
    return this.http.put<any>(`${this.API_URL}/editar-solicitud}`,{}).pipe(
      tap(() => console.log('Solicitud editada exitosamente')),
      catchError((error) => {
        console.error('Error al editar la solicitud:', error);
        return throwError(() => new Error('Error al editar la solicitud'));
      })
    );
  }

  guardarBorrador(payload: NuevaSolicitudPayload): Observable<{ ok: true }> {
    return of({ ok: true as const }).pipe(delay(250));
  }

  listarMisSolicitudes(numeroCuenta: string): Observable<MiSolicitudResponse> {
    return this.http.get<MiSolicitudResponse>(`${this.API_URL}/solicitudes/${numeroCuenta}`).pipe(
      tap((response) => {
        const {solicitudes } = response; 
        this.misSolicitudes.set(solicitudes);
        console.log('Solicitudes obtenidas:', response);
      }),
      catchError((error) => {
        console.error('Error al obtener las solicitudes:', error);
        return throwError(() => new Error('Error al obtener las solicitudes'));
      })
    );
  }

  documentosSolicitados(numeroCuenta : string){

  }
}
