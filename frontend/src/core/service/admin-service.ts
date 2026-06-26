import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  SolicitudesResponse,
  InventarioLockersResponse,
  LockersListResponse,
  CrearLockerPayload,
  ActualizarLockerPayload,
  BajaLockerPayload,
  EvaluarDocumentoPayload,
  RechazarSolicitudPayload,
  AprobarLockerPayload,
  AprobarEstacionamientoPayload,
} from '../interfaces/admin-interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Solicitudes ──────────────────────────────

  obtenerTodasSolicitudes(filtros?: {
    tipo_tramite?: string;
    estado?: string;
    fecha?: string;
  }): Observable<SolicitudesResponse> {
    let params = new HttpParams();
    if (filtros?.tipo_tramite) params = params.set('tipo_tramite', filtros.tipo_tramite);
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.fecha) params = params.set('fecha', filtros.fecha);
    return this.http.get<SolicitudesResponse>(`${this.API_URL}/solicitudes/`, { params });
  }

  evaluarDocumento(
    idSolicitud: number,
    idDocumento: number,
    datos: EvaluarDocumentoPayload
  ): Observable<any> {
    return this.http.put(
      `${this.API_URL}/solicitudes/${idSolicitud}/documentos/${idDocumento}`,
      datos
    );
  }

  rechazarSolicitud(
    idSolicitud: number,
    datos: RechazarSolicitudPayload
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/solicitudes/${idSolicitud}/rechazar`, datos);
  }

  // ── Inventario ───────────────────────────────

  obtenerInventarioLockers(): Observable<InventarioLockersResponse> {
    return this.http.get<InventarioLockersResponse>(`${this.API_URL}/inventario/lockers`);
  }

  listarTodosLockers(): Observable<LockersListResponse> {
    return this.http.get<LockersListResponse>(`${this.API_URL}/admin/lockers`);
  }

  crearLocker(datos: CrearLockerPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/lockers`, datos);
  }

  actualizarLocker(idLocker: number, datos: ActualizarLockerPayload): Observable<any> {
    return this.http.put(`${this.API_URL}/admin/lockers/${idLocker}`, datos);
  }

  darBajaLocker(idLocker: number, datos: BajaLockerPayload): Observable<any> {
    return this.http.patch(`${this.API_URL}/admin/lockers/${idLocker}/baja`, datos);
  }

  // ── Aprobaciones ─────────────────────────────

  aprobarLocker(
    idSolicitud: number,
    datos: AprobarLockerPayload
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/solicitudes/${idSolicitud}/aprobar-locker`, datos);
  }

  aprobarEstacionamiento(
    idSolicitud: number,
    datos: AprobarEstacionamientoPayload
  ): Observable<any> {
    return this.http.post(
      `${this.API_URL}/solicitudes/${idSolicitud}/aprobar-estacionamiento`,
      datos
    );
  }
}
