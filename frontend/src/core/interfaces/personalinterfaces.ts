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