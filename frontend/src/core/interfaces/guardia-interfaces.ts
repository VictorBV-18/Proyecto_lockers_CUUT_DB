// Interfaces para la vista de Guardia (escaneo de QR y validación de tarjetones)

export interface AlumnoVerificacion {
  nombre_completo: string;
  numero_cuenta: string;
  carrera: string;
}

export interface VehiculoVerificacion {
  placas: string;
  modelo: string;
  color: string;
}

// Contrato real de GET /guardia/verificar/{qr_token}
export interface VerificacionQrResponse {
  estado_acceso: string; // 'VIGENTE' | 'VENCIDO'
  id_asignacion: number;
  tipo_tramite: string; // 'LOCKER' | 'ESTACIONAMIENTO'
  alumno: AlumnoVerificacion;
  vehiculo: VehiculoVerificacion | null;
}

// Contrato real de POST /guardia/registrar-acceso
export interface RegistrarAccesoPayload {
  id_guardia: number;
  id_asignacion: number;
  identidad_confirmada: boolean;
  vehiculo_coincide: boolean;
  motivo?: string;
  evidencia?: File | null;
}

export interface RegistrarAccesoResponse {
  mensaje: string;
  id_acceso: number;
}

export interface HistorialVerificacionItem {
  hora: string;
  nombre_completo: string;
  numero_cuenta: string;
  tipo_tramite: string;
  resultado: 'VALIDO' | 'INVALIDO';
  detalle: string;
}
