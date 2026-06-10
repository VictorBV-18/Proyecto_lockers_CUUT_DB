

Table alumno {
  id_alumno int [pk, increment]
  numero_cuenta varchar(20) [not null, unique]
  nombre varchar(80) [not null]
  apellidos varchar(120) [not null]
  carrera_abreviatura varchar(10) [not null]
}

Table admin {
  id_admin int [pk, increment]
  numero_cuenta varchar(20) [not null, unique]
  nombre varchar(80) [not null]
  apellidos varchar(120) [not null]
}

Table locker {
  id_locker int [pk, increment]
  codigo_locker varchar(20) [not null, unique]
  ubicacion varchar(120) [not null]
  estado varchar(20) [not null, default: 'DISPONIBLE']
}

Table solicitud {
  id_solicitud int [pk, increment]
  id_alumno int [not null]
  tipo_tramite varchar(50) [not null, note: 'locker o estacionamiento']
  fecha_solicitud timestamp [not null]
  estado varchar(20) [not null, default: 'PENDIENTE']
  observacion_alumno text
}

Table tipo_documento {
  id_tipo_documento int [pk, increment]
  nombre_tipo_documento varchar(60) [not null, unique]
  obligatorio boolean [not null, default: true]
}

Table documentos_solicitud {
  id_documento int [pk, increment]
  id_solicitud int [not null]
  id_tipo_documento int [not null]
  archivo_path varchar(150) [not null]
  fecha_subida timestamp [not null]
  estado varchar(20) [not null, default: 'PENDIENTE']
  comentario text

  Indexes {
    (id_solicitud, id_tipo_documento) [unique]
  }
}

Table revision {
  id_revision int [pk, increment]
  id_solicitud int [not null]
  id_admin int [not null]
  fecha_revision timestamp [not null]
  resultado varchar(20) [not null]
  observacion text
}

Table asignacion {
  id_asignacion int [pk, increment]
  id_solicitud int [not null, unique]
  id_locker int [null] // Nullable para permitir estacionamiento
  fecha_asignacion timestamp [not null]
  estado varchar(20) [not null, default: 'ACTIVA']
}

Table constancia {
  id_constancia int [pk, increment]
  id_asignacion int [not null, unique]
  fecha_generacion timestamp [not null]
  folio varchar(30) [not null, unique]
}

// RELACIONES
Ref: solicitud.id_alumno > alumno.id_alumno
Ref: documentos_solicitud.id_solicitud > solicitud.id_solicitud
Ref: documentos_solicitud.id_tipo_documento > tipo_documento.id_tipo_documento
Ref: revision.id_solicitud > solicitud.id_solicitud
Ref: revision.id_admin > admin.id_admin
Ref: asignacion.id_solicitud > solicitud.id_solicitud
Ref: asignacion.id_locker > locker.id_locker
Ref: constancia.id_asignacion > asignacion.id_asignacion