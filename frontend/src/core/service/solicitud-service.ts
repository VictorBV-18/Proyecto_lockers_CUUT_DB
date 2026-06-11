import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type TipoSolicitudApi   = 'estacionamiento' | 'locker';
export type EstadoSolicitudApi = 'en_revision' | 'aprobada' | 'rechazada';

export interface DocumentoAdjuntoPayload {
  id:            string;
  nombre:        string;
  archivoNombre: string;
  archivoTamano: number;
}

export interface NuevaSolicitudPayload {
  numeroCuenta: string;
  tipo:         TipoSolicitudApi;
  documentos:   DocumentoAdjuntoPayload[];
}

export interface SolicitudResumen {
  id:     string;
  tipo:   string;
  folio:  string;
  fecha:  string;
  estado: EstadoSolicitudApi;
}

const HISTORIAL_INICIAL: SolicitudResumen[] = [
  { id: '1', tipo: 'Permiso de Estacionamiento', folio: 'SOL-2026-0142', fecha: '08/06/2026', estado: 'en_revision' },
  { id: '2', tipo: 'Obtención de Locker',        folio: 'SOL-2026-0098', fecha: '02/06/2026', estado: 'aprobada'    },
  { id: '3', tipo: 'Permiso de Estacionamiento', folio: 'SOL-2025-0871', fecha: '14/12/2025', estado: 'rechazada'   },
];

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  constructor(private http: HttpClient) {}

  crearSolicitud(payload: NuevaSolicitudPayload): Observable<{ folio: string }> {
    const folio = `SOL-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
    return of({ folio }).pipe(delay(400));
  }

  guardarBorrador(payload: NuevaSolicitudPayload): Observable<{ ok: true }> {
    return of({ ok: true as const }).pipe(delay(250));
  }

  listarMisSolicitudes(numeroCuenta: string): Observable<SolicitudResumen[]> {
    return of(HISTORIAL_INICIAL).pipe(delay(200));
  }
}
