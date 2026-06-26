export type EstadoSolicitud = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';

export interface Solicitudes {
  solicitudes: Solicitud[]
}

export interface Solicitud {
  id_solicitud: number
  folio: string
  numero_cuenta: string
  nombre_completo: string
  tipo_tramite: string
  fecha_solicitud: string
  estado: string
}

export interface validarDocumento{
    id_solicitud: number,
    id_documento: number,
    id_admin:number,
    estado: EstadoSolicitud | ""
    comentario:"",
}

export interface documentoResponse{
  mensaje: string,
  id_solicitud: number,
  id_documento: number,
  nuevo_estado: EstadoSolicitud | null,
  comentario_registrado: string
}

export interface DocumentoRevisor {
  id_documento: number;
  id_tipo_documento: number;
  nombre_tipo_documento: string;
  archivo: string;
  estado_documento: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  comentario_admin: string | null;
}

export interface SolicitudDetalleRevisor {
  id_solicitud: number;
  tipo_tramite: string;
  estado: string;
  numero_cuenta: string;
  nombre_completo: string;
  fecha_solicitud: string;
  documentos: DocumentoRevisor[];
}