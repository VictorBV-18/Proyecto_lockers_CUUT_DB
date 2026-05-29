--DIAGRAMA ENTIDAD RELACION DE LOS LOCKERS CUUT
Table alumno {
  id_alumno int [pk, increment]
  numero_cuenta varchar(20) [not null, unique]
  nombre varchar(80) [not null]
  apellidos varchar(120) [not null]
  carrera_abreviatura varchar(10) [not null, note: 'Ejemplo: ICO, IPI, IPL']
}

Table admin {
  id_admin int [pk, increment]
  numero_cuenta varchar(20) [not null, unique]
  nombre varchar(80) [not null]
  apellidos varchar(120) [not null]
}

Table locker {
  id_locker int [pk, increment]
  codigo_locker varchar(20) [not null, unique, note: 'Ejemplo: L-01, A-12, PB-07']
  ubicacion varchar(120) [not null]
  estado varchar(20) [not null, default: 'DISPONIBLE', note: 'DISPONIBLE, OCUPADO, INACTIVO']
}

Table solicitud {
  id_solicitud int [pk, increment]
  id_alumno int [not null]
  fecha_solicitud timestamp [not null]
  estado varchar(20) [not null, default: 'PENDIENTE', note: 'PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, CANCELADA']
  observacion_alumno text
}

Table tipo_documento {
  id_tipo_documento int [pk, increment]
  nombre_tipo_documento varchar(60) [not null, unique, note: 'Ejemplo: INE, Tira de materias, Credencial escolar']
  obligatorio boolean [not null, default: true]
}

Table documento {
  id_documento int [pk, increment]
  id_solicitud int [not null]
  id_tipo_documento int [not null]
  nombre_archivo varchar(150) [not null]
  fecha_subida timestamp [not null]
  estado_validacion varchar(20) [not null, default: 'PENDIENTE', note: 'PENDIENTE, APROBADO, RECHAZADO']
  comentario_admin text

  Indexes {
    (id_solicitud, id_tipo_documento) [unique]
  }
}

Table revision {
  id_revision int [pk, increment]
  id_solicitud int [not null]
  id_admin int [not null]
  fecha_revision timestamp [not null]
  resultado varchar(20) [not null, note: 'APROBADA, RECHAZADA']
  observacion text
}

Table asignacion {
  id_asignacion int [pk, increment]
  id_solicitud int [not null, unique]
  id_locker int [not null]
  fecha_asignacion timestamp [not null]
  estado varchar(20) [not null, default: 'ACTIVA', note: 'ACTIVA, FINALIZADA, CANCELADA']
}

Table constancia {
  id_constancia int [pk, increment]
  id_asignacion int [not null, unique]
  fecha_generacion timestamp [not null]
  folio varchar(30) [not null, unique]
}

Ref: solicitud.id_alumno > alumno.id_alumno
Ref: documento.id_solicitud > solicitud.id_solicitud
Ref: documento.id_tipo_documento > tipo_documento.id_tipo_documento
Ref: revision.id_solicitud > solicitud.id_solicitud
Ref: revision.id_admin > admin.id_admin
Ref: asignacion.id_solicitud > solicitud.id_solicitud
Ref: asignacion.id_locker > locker.id_locker
Ref: constancia.id_asignacion > asignacion.id_asignacion

--Contraseña de PostgreSQL vitorrex26 (local)