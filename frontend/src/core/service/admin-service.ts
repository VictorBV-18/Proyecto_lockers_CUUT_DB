import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  EstadisticasDashboardResponse,
  UsuariosListResponse,
  InventarioLockersResponse,
  LockersListResponse,
  CrearLockerPayload,
  ActualizarLockerPayload,
  BajaLockerPayload,
  EvaluarDocumentoPayload,
  RechazarSolicitudPayload,
  AprobarLockerPayload,
  AprobarEstacionamientoPayload,
  AceptarSolicitudPayload,
  AceptarSolicitudResponse,
  CrearAlumnoPayload,
  CrearPersonalPayload,
  CrearGuardiaPayload,
  CrearGuardiaResponse,
  CambioEstadoPayload,
  CambioRolPayload,
  LiberacionMasivaPayload,
  LiberacionMasivaResponse,
  AuditoriaAccesosResponse,
  HistorialAccesosDenegadosResponse,
  DesbloquearAccesoPayload,
  DesbloquearAccesoResponse,

} from '../interfaces/admin-interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Solicitudes ──────────────────────────────

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

  // ── Dashboard ──────────────────────────────────

  obtenerEstadisticasDashboard(): Observable<EstadisticasDashboardResponse> {
    return this.http.get<EstadisticasDashboardResponse>(`${this.API_URL}/admin/estadisticas/dashboard`);
  }

  // ── Usuarios ───────────────────────────────────

  listarUsuarios(filtros?: {
    rol?: string;
    estado_activo?: boolean;
    busqueda?: string;
    page?: number;
  }): Observable<UsuariosListResponse> {
    let params = new HttpParams();
    if (filtros?.rol) params = params.set('rol', filtros.rol);
    if (filtros?.estado_activo !== undefined) params = params.set('estado_activo', filtros.estado_activo);
    if (filtros?.busqueda) params = params.set('busqueda', filtros.busqueda);
    params = params.set('page', filtros?.page ?? 1);
    return this.http.get<UsuariosListResponse>(`${this.API_URL}/admin/usuarios`, { params });
  }

  crearCuentaAlumno(datos: CrearAlumnoPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/usuarios/alumno`, datos);
  }

  crearCuentaPersonal(datos: CrearPersonalPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/usuarios/personal`, datos);
  }

  // Autogenera número de cuenta (900XXXX) y contraseña, y envía las credenciales por correo.
  crearCuentaGuardia(datos: CrearGuardiaPayload): Observable<CrearGuardiaResponse> {
    return this.http.post<CrearGuardiaResponse>(`${this.API_URL}/admin/usuarios/guardia`, datos);
  }

  cambiarEstadoUsuario(datos: CambioEstadoPayload): Observable<any> {
    return this.http.put(`${this.API_URL}/admin/usuarios/estado`, datos);
  }

  cambiarRolUsuario(datos: CambioRolPayload): Observable<any> {
    return this.http.put(`${this.API_URL}/admin/usuarios/rol`, datos);
  }

  // ── Auditoría ──────────────────────────────────

  // El backend regresa los accesos paginados de 20 en 20.
  obtenerAuditoriaAccesos(page: number = 1): Observable<AuditoriaAccesosResponse> {
    const params = new HttpParams().set('page', page);
    return this.http.get<AuditoriaAccesosResponse>(
      `${this.API_URL}/admin/guardia/auditoria-accesos`,
      { params },
    );
  }

  exportarAuditoriaAccesosExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/admin/guardia/auditoria-accesos/excel`, {
      responseType: 'blob',
    });
  }

  exportarAuditoriaSolicitudesExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/admin/auditoria/solicitudes/excel`, {
      responseType: 'blob',
    });
  }

  // ── Apelaciones de bloqueo (alumno con 3 strikes) ──

  consultarEvidenciasApelacion(numeroCuenta: string): Observable<HistorialAccesosDenegadosResponse> {
    return this.http.get<HistorialAccesosDenegadosResponse>(
      `${this.API_URL}/admin/auditoria/evidencia-accesos-denegados/${numeroCuenta}`,
    );
  }

  // La propia <img>/<iframe> hace el GET directamente, no pasa por HttpClient.
  obtenerUrlEvidenciaAcceso(idAcceso: number): string {
    return `${this.API_URL}/admin/auditoria/accesos/${idAcceso}/evidencia/visualizar`;
  }

  desbloquearAccesoAlumno(
    numeroCuenta: string,
    datos: DesbloquearAccesoPayload,
  ): Observable<DesbloquearAccesoResponse> {
    return this.http.put<DesbloquearAccesoResponse>(
      `${this.API_URL}/admin/usuarios/${numeroCuenta}/desbloquear-acceso`,
      datos,
    );
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

  // Reactiva un locker en MANTENIMIENTO. id_admin va como query param, igual que en-revision.
  darAltaLocker(idLocker: number, idAdmin: number): Observable<any> {
    const params = new HttpParams().set('id_admin', idAdmin);
    return this.http.patch(`${this.API_URL}/admin/lockers/${idLocker}/alta`, null, { params });
  }

  darBajaLocker(idLocker: number, datos: BajaLockerPayload): Observable<any> {
    return this.http.patch(`${this.API_URL}/admin/lockers/${idLocker}/baja`, datos);
  }

  liberacionMasivaLockers(datos: LiberacionMasivaPayload): Observable<LiberacionMasivaResponse> {
    return this.http.post<LiberacionMasivaResponse>(`${this.API_URL}/admin/inventario/liberacion-masiva`, datos);
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
  // Genera la constancia/tarjetón con QR y envía el correo al alumno.
  // Se llama tras aprobar el locker o el estacionamiento.
  aceptarSolicitud(
    idSolicitud: number,
    datos: AceptarSolicitudPayload
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/solicitudes/${idSolicitud}/aceptar`, datos);

  }
}
