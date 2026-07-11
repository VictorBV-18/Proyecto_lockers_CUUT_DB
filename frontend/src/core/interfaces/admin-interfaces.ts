// Interfaces para el panel de administrador

export interface SolicitudAdmin {
  id_solicitud: number;
  folio: string;
  numero_cuenta: string;
  nombre_completo: string;
  tipo_tramite: string;
  fecha_solicitud: string;
  estado: string;
}

export interface SolicitudesResponse {
  solicitudes: SolicitudAdmin[];
}

export interface InventarioLockersResponse {
  total_lockers: number;
  disponibles: number;
  ocupados: number;
  mantenimiento: number;
  porcentaje_disponible: number;
  alerta_baja_disponibilidad: boolean;
  lockers_disponibles: LockerItem[];
}

export interface LockerItem {
  id_locker: number;
  codigo_locker: string;
  ubicacion: string;
  estado: string;
}

export interface LockersListResponse {
  lockers: LockerItem[];
}

export interface CrearLockerPayload {
  codigo_locker: string;
  ubicacion: string;
  estado: string;
}

export interface ActualizarLockerPayload {
  codigo_locker: string;
  ubicacion: string;
  estado: string;
}

export interface BajaLockerPayload {
  id_admin: number;
  motivo: string;
}

export interface EvaluarDocumentoPayload {
  id_admin: number;
  estado: 'APROBADO' | 'RECHAZADO';
  comentario?: string;
}

export interface RechazarSolicitudPayload {
  id_admin: number;
  motivo: string;
}

export interface AprobarLockerPayload {
  id_admin: number;
  id_locker: number;
  comentario?: string;
}

export interface AprobarEstacionamientoPayload {
  id_admin: number;
  comentario?: string;
}

export interface AceptarSolicitudPayload {
  id_admin: number;
  meses_vigencia: number;
}

export interface AceptarSolicitudResponse {
  mensaje: string;
  folio: string;
  qr_token: string;
  archivo: string;
}
