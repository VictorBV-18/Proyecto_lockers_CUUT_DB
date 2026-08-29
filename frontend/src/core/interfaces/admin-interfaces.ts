// Interfaces para el panel de administrador

export interface EstadisticasDashboardResponse {
  solicitudes: {
    total: number;
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
  };
  lockers: {
    total: number;
    disponibles: number;
    ocupados: number;
    mantenimiento: number;
  };
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

export interface LiberacionMasivaPayload {
  id_admin: number;
  motivo?: string;
}

export interface LiberacionMasivaResponse {
  mensaje: string;
  lockers_liberados: number;
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

export interface UsuarioSistema {
  id_usuario: number;
  numero_cuenta: string;
  nombre_completo: string;
  correo_electronico: string | null;
  estado_activo: boolean;
  rol: string;
}

export interface UsuariosListResponse {
  pagina_actual: number;
  registros_por_pagina: number;
  total_registros: number;
  total_paginas: number;
  resultados: UsuarioSistema[];
}

export interface CambioEstadoPayload {
  numero_cuenta: string;
  estado_activo: boolean;
}

export interface CambioRolPayload {
  numero_cuenta: string;
  nuevo_rol: string;
}

// ── Apelación de bloqueo por accesos denegados (3 strikes) ──

export interface AccesoDenegadoHistorial {
  id_acceso: number;
  fecha_rechazo: string;
  guardia: string;
  tramite: string;
  folio: string;
  qr_token: string;
  vigencia: string;
  motivo: string;
  evidencia: string | null;
}

export interface HistorialAccesosDenegadosResponse {
  numero_cuenta: string;
  historial_denegados: AccesoDenegadoHistorial[];
}

export interface DesbloquearAccesoPayload {
  id_admin: number;
  comentario: string;
}

export interface DesbloquearAccesoResponse {
  mensaje: string;
  permisos_restaurados: number;
}

// ── Auditoría de accesos (guardia) ──────────────

export interface RegistroAccesoAuditoria {
  id_acceso: number;
  fecha_hora: string;
  estado_acceso: 'PERMITIDO' | 'DENEGADO';
  identidad_confirmada: boolean;
  vehiculo_coincide: boolean;
  guardia_turno: string;
  alumno: {
    numero_cuenta: string;
    nombre: string;
  };
  tramite: string;
  vehiculo: {
    placas: string;
    modelo: string;
  };
  motivo: string | null;
  evidencia: string | null;
}

export interface AuditoriaAccesosResponse {
  pagina_actual: number;
  registros_por_pagina: number;
  total_registros: number;
  total_paginas: number;
  resultados: RegistroAccesoAuditoria[];
}

// Interfaces para datos mock

export interface RequisitoMock {
  id: number;
  nombre: string;
  obligatorio: boolean;
  tramiteAsociado: string;
}

// Interfaces para la creación de cuentas
export type TipoCuentaNueva = 'ADMIN' | 'REVISOR' | 'ALUMNO' | 'VIGILANTE';

export const CARRERAS_VALIDAS = [
  'Licenciatura en Ingeniería en Computación',
  'Licenciatura en Ingeniería en Software',
  'Licenciatura en Ingeniería en Producción Industrial',
  'Licenciatura en Ingeniería en Mecánica',
  'Licenciatura en Seguridad Ciudadana',
  'Licenciatura en Ingeniería en Ciberseguridad',
  'Licenciatura en Ingeniería en Plásticos',
];

export interface CrearAlumnoPayload {
  numero_cuenta: string;
  nombre: string;
  apellidos: string;
  correo_electronico: string;
  carrera: string;
}

export interface CrearPersonalPayload {
  numero_cuenta: string;
  nombre: string;
  apellidos: string;
  contrasena: string;
  rol: string;
  correo_electronico?: string;
}

export interface CrearGuardiaPayload {
  nombre: string;
  apellidos: string;
  correo_electronico: string;
}

export interface CrearGuardiaResponse {
  mensaje: string;
  id_admin: number;
  numero_cuenta_generado: string;
}
