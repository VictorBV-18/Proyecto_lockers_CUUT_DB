export type TipoSolicitudApi   = 'estacionamiento' | 'locker';
export type EstadoSolicitudApi = 'en_revision' | 'aprobada' | 'rechazada' | 'pendiente';
export type TipoDocumento = [
  {id:1 , nombre : "Credencial Escolar"},
  {id:2 , nombre: "Tira de Materias"},
  {id:3 , nombre : "Tarjeta de Circulación"},
  {id:4, nombre :"Licencia de Conducir"},
]

export interface loginResponse{
  mensaje:string
  rol: string,
  id_admin?: number,
}



export interface NuevaSolicitudPayload {
  numero_cuenta: string;
  tipo_tramite:  TipoSolicitudApi;
  observacion: string | null
  correo_electronico: string
}
export interface NuevaSolicitudResponse {
  mensaje : string,
  archivo: string
}

export interface NuevaSolcitudResponse {
  mensaje: string,
  id_solicitud: number,
  observacion_registrada: string,
  correo_actualizado: string
  estatus : true
}

export interface FinalizarSolicitudResponse {
  mensaje: string,
  nuevo_estado: string
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
  idTipoDocumento: number;
  nombre: string;
  formatos: string;
  archivo: File | null;
  error: string | null;
}

export interface MiSolicitudResponse {
  numero_cuenta:string
  tramites: SolicitudesEstudiante[];
}

export interface SolicitudesEstudiante{
  estado_solicitud: string
  fecha_solicitud: string
  folio: string
  id_solicitud: string
  tipo_tramite: string
  qr_token?: string
}

export interface DocumentoDetalle {
  id_tipo_documento: number;
  archivo: string;
  comentario_admin: string | null;
  estado_documento: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  id_documento: number;
}

export interface SolicitudDetallada {
  id_solicitud: string;
  folio: string;
  tipo_tramite: string;
  estado_solicitud: string;
  documentos_tramite: DocumentoDetalle[];
}

export interface SolicitudesDetalladasResponse {
  numero_cuenta: string;
  solicitudes: SolicitudDetallada[];
}

export interface Notificacion {
  id_notificacion: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export interface NotificacionesResponse {
  notificaciones: Notificacion[];
}