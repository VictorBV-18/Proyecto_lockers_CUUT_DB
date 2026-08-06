// Interfaces para la vista de Guardia (escaneo de QR y validación de tarjetones)

export type EstadoConstancia = 'VIGENTE' | 'EXPIRADA' | 'REVOCADA' | 'CANCELADA';

export interface RecursoAsignado {
  codigo: string;
  ubicacion: string;
}

// Contrato esperado del endpoint GET /guardia/verificar/{qr_token} (pendiente en el backend)
export interface VerificacionQrResponse {
  valido: boolean;
  estado: EstadoConstancia;
  folio: string;
  nombre_completo: string;
  numero_cuenta: string;
  tipo_tramite: string;
  vigencia: string;
  recurso: RecursoAsignado | null;
}

export interface HistorialVerificacionItem {
  hora: string;
  nombre_completo: string;
  numero_cuenta: string;
  tipo_tramite: string;
  resultado: 'VALIDO' | 'INVALIDO';
  detalle: string;
}
