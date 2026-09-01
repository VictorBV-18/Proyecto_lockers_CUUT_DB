import { SafeResourceUrl } from '@angular/platform-browser';

export type TipoSolicitudApi   = 'estacionamiento' | 'locker';
export type EstadoSolicitudApi =
  | 'DATOS_INCOMPLETOS'
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'DOCUMENTACION_INCORRECTA'
  | 'REPOSICION'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'FINALIZADA';
export type TipoDocumento = [
  {id:1 , nombre : "Credencial Escolar"},
  {id:2 , nombre: "Tira de Materias"},
  {id:3 , nombre : "Tarjeta de Circulación"},
  {id:4, nombre :"Licencia de Conducir"},
]

export interface loginResponse{
  mensaje:string
  rol: string,
  datos_usuario: {
    id: number,
    nombre_completo: string,
    numero_cuenta: string,
    correo: string,
  },
}



export interface NuevaSolicitudPayload {
  numero_cuenta: string;
  tipo_tramite:  TipoSolicitudApi;
  placas?: string
  modelo?: string
  color?: string
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

export interface DocumentoRequerido {
  id: string;
  idTipoDocumento: number;
  nombre: string;
  formatos: string;
  archivo: File | null;
  error: string | null;
  previewUrl: SafeResourceUrl | null;
}

export interface MiSolicitudResponse {
  numero_cuenta:string
  tramites: SolicitudesEstudiante[];
}

export interface SolicitudesEstudiante{
  estado_solicitud: EstadoSolicitudApi
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
  estado_solicitud: EstadoSolicitudApi;
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
  pagina_actual: number;
  registros_por_pagina: number;
  total_registros: number;
  total_paginas: number;
  resultados: Notificacion[];
}

export interface ContadorNoLeidasResponse {
  no_leidas: number;
}

export interface DocumentoRecursoActivo {
  folio: string;
  qr_token: string;
  vigencia: string;
  estado: string;
  url_descarga: string;
}

export interface DetalleRecurso {
  codigo_locker?: string;
  ubicacion?: string;
  vehiculo?: {
    placas: string;
    modelo: string;
    color: string;
  };
}

export interface RecursoActivo {
  id_solicitud: number;
  tipo_tramite: TipoSolicitudApi;
  alumno: {
    nombre_completo: string;
    numero_cuenta: string;
  };
  fecha_asignacion: string;
  documento: DocumentoRecursoActivo | null;
  detalles_recurso: DetalleRecurso;
}

export interface CambiarContrasenaPayload {
  contrasena_actual: string;
  contrasena_nueva: string;
}

export interface CambiarContrasenaResponse {
  mensaje: string;
}

export interface VehiculoRegistrado {
  placas: string;
  modelo: string;
  color: string;
}

export interface PerfilAlumnoResponse {
  numero_cuenta: string;
  nombre_completo: string;
  carrera: string;
  correo_electronico: string;
  estado_activo: boolean;
  vehiculos_registrados: VehiculoRegistrado[];
}