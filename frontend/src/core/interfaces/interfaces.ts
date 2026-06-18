export type TipoSolicitudApi   = 'estacionamiento' | 'locker';
export type EstadoSolicitudApi = 'en_revision' | 'aprobada' | 'rechazada' | 'pendiente';

export interface loginResponse{
  mensaje:string
  rol: string,
}

export interface MiSolicitudResponse {
  solicitudes: SolicitudResumen[];
}


export interface DocumentoAdjuntoPayload {
  id:            string;
  nombre:        string;
  archivoNombre: string;
  archivoTamano: number;
}

export interface NuevaSolicitudPayload {
  numeroCuenta: string;
  tipo:         TipoSolicitudApi;
  //documentos:   DocumentoAdjuntoPayload[];
}

export interface SolicitudResumen {
  id_solicitud:     string;
  tipo_tramite:   string;
  folio:  string;
  fecha_solicitud:  string;
  estado: EstadoSolicitudApi;
  observacion_alumno:string
}

export interface SolicitudDetalle {
  id_solicitud: string,
  tipo_tramite: string,
  archivo_path:string,
  fecha_subida: string,
  estado: EstadoSolicitudApi,
  comentario: string,
}

export interface DocumentoRequerido {
  id: string;
  nombre: string;
  formatos: string;
  archivo: File | null;
  error: string | null;
}