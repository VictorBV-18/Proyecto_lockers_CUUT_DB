DROP TABLE IF EXISTS auditoria_acceso CASCADE;
DROP TABLE IF EXISTS vehiculo_solicitud CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS historial_estados CASCADE;
DROP TABLE IF EXISTS constancia CASCADE;
DROP TABLE IF EXISTS asignacion CASCADE;
DROP TABLE IF EXISTS revision CASCADE;
DROP TABLE IF EXISTS documentos_solicitud CASCADE;
DROP TABLE IF EXISTS solicitud CASCADE;
DROP TABLE IF EXISTS tipo_documento CASCADE;
DROP TABLE IF EXISTS locker CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS alumno CASCADE;

CREATE TABLE alumno (
    id_alumno SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    carrera VARCHAR(100) NOT NULL, 
    correo_electronico VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL, 
    estado_activo BOOLEAN NOT NULL DEFAULT TRUE 
);

CREATE TABLE admin (
    id_admin SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL, 
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo_electronico VARCHAR(150), 
    contrasena_hash VARCHAR(255) NOT NULL, 
    estado_activo BOOLEAN NOT NULL DEFAULT TRUE, 
    rol VARCHAR(20) NOT NULL DEFAULT 'REVISOR' CHECK (rol IN ('ADMIN', 'REVISOR', 'VIGILANTE'))
);

CREATE TABLE locker (
    id_locker SERIAL PRIMARY KEY,
    codigo_locker VARCHAR(20) UNIQUE NOT NULL,
    ubicacion VARCHAR(120) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE'
);

CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre_tipo_documento VARCHAR(60) UNIQUE NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    tramite_asociado VARCHAR(30) NOT NULL DEFAULT 'ambos' CHECK (tramite_asociado IN ('locker', 'estacionamiento', 'ambos'))
);

CREATE TABLE solicitud (
    id_solicitud SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    tipo_tramite VARCHAR(50) NOT NULL DEFAULT 'locker' CHECK (tipo_tramite IN ('locker', 'estacionamiento')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    observacion_alumno TEXT,
    revisado_por INT, 
    fecha_revision TIMESTAMP, 
    CONSTRAINT fk_solicitud_alumno FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
    CONSTRAINT fk_solicitud_admin FOREIGN KEY (revisado_por) REFERENCES admin(id_admin)
);

CREATE TABLE vehiculo_solicitud (
    id_vehiculo SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL, 
    placas VARCHAR(20) NOT NULL,
    modelo VARCHAR(80) NOT NULL,
    color VARCHAR(30) NOT NULL,
    CONSTRAINT fk_vehiculo_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE
);

CREATE TABLE documentos_solicitud (
    id_documento SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_tipo_documento INT NOT NULL, 
    archivo_path VARCHAR(150) NOT NULL, 
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', 
    comentario TEXT, 
    CONSTRAINT fk_documento_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_documento_tipo FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_documento_solicitud_tipo UNIQUE (id_solicitud, id_tipo_documento)
);

CREATE TABLE historial_estados (
    id_historial SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_admin INT, 
    comentario TEXT,
    CONSTRAINT fk_historial_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_historial_admin FOREIGN KEY (id_admin) REFERENCES admin(id_admin)
);

CREATE TABLE asignacion (
    id_asignacion SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL UNIQUE,
    id_locker INT, 
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_asignacion_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_asignacion_locker FOREIGN KEY (id_locker) REFERENCES locker(id_locker)
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE constancia (
    id_constancia SERIAL PRIMARY KEY,
    id_asignacion INT NOT NULL UNIQUE,
    folio VARCHAR(50) NOT NULL UNIQUE,
    qr_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'VIGENTE',
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vigencia DATE NOT NULL,
    documento_path VARCHAR(255) NOT NULL,
    CONSTRAINT fk_constancia_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion)
);

CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20), 
    rol_destino VARCHAR(20), 
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_acceso (
    id_acceso SERIAL PRIMARY KEY,
    id_guardia INT NOT NULL,
    id_asignacion INT NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    identidad_confirmada BOOLEAN NOT NULL,
    vehiculo_coincide BOOLEAN NOT NULL,
    motivo TEXT,
    evidencia_path VARCHAR(150),
    CONSTRAINT fk_acceso_guardia FOREIGN KEY (id_guardia) REFERENCES admin(id_admin),
    CONSTRAINT fk_acceso_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_activa_locker ON solicitud (id_alumno, tipo_tramite) 
WHERE tipo_tramite = 'locker' AND estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'DOCUMENTACION_INCORRECTA', 'REPOSICION');

CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_activa_por_locker ON asignacion (id_locker) WHERE estado = 'ACTIVA' AND id_locker IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_alumno ON solicitud(id_alumno);
CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_estado ON solicitud(estado);
CREATE INDEX IF NOT EXISTS idx_notif_cuenta ON notificaciones(numero_cuenta);
CREATE INDEX IF NOT EXISTS idx_notif_rol ON notificaciones(rol_destino);
CREATE INDEX IF NOT EXISTS idx_qr_token ON constancia(qr_token);