export type TipoSolicitudApi   = 'estacionamiento' | 'locker';
export type EstadoSolicitudApi = 'en_revision' | 'aprobada' | 'rechazada' | 'pendiente';
export type TipoDocumento = [
  {id:1 , nombre : "INE"},
  {id:2 , nombre: "Tira de materias"},
  {id:3 , nombre : "Tarjeta de circulacion"},
  {id:4, nombre :"Licencia de conducir"},
  {id:5, nombre :"Credencial escolar"}
]

export interface loginResponse{
  mensaje:string
  rol: string,
}

export interface MiSolicitudResponse {
  solicitudes: SolicitudResumen[];
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