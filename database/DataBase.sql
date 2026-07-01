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

-- Tabla alumno
CREATE TABLE alumno (
    id_alumno SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    carrera_abreviatura VARCHAR(10) NOT NULL,
    correo_electronico VARCHAR(150) NOT NULL 
);

-- Tabla admin
CREATE TABLE admin (
    id_admin SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL, 
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'REVISOR' CHECK (rol IN ('ADMIN', 'REVISOR', 'VIGILANTE'))
);

-- Tabla locker
CREATE TABLE locker (
    id_locker SERIAL PRIMARY KEY,
    codigo_locker VARCHAR(20) UNIQUE NOT NULL,
    ubicacion VARCHAR(120) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE'
);

-- Tabla tipo_documento
CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre_tipo_documento VARCHAR(60) UNIQUE NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    tramite_asociado VARCHAR(30) NOT NULL DEFAULT 'ambos' CHECK (tramite_asociado IN ('locker', 'estacionamiento', 'ambos'))
);

-- Tabla solicitud
CREATE TABLE solicitud (
    id_solicitud SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    tipo_tramite VARCHAR(50) NOT NULL DEFAULT 'locker' CHECK (tipo_tramite IN ('locker', 'estacionamiento')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    observacion_alumno TEXT,
    revisado_por INT, 
    fecha_revision TIMESTAMP, 
    CONSTRAINT fk_solicitud_alumno
        FOREIGN KEY (id_alumno)
        REFERENCES alumno(id_alumno),
    CONSTRAINT fk_solicitud_admin
        FOREIGN KEY (revisado_por)
        REFERENCES admin(id_admin)
);

-- Tabla documentos_solicitud
CREATE TABLE documentos_solicitud (
    id_documento SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_tipo_documento INT NOT NULL, 
    archivo_path VARCHAR(150) NOT NULL, 
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', 
    comentario TEXT, 
    CONSTRAINT fk_documento_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_documento_tipo
        FOREIGN KEY (id_tipo_documento)
        REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_documento_solicitud_tipo
        UNIQUE (id_solicitud, id_tipo_documento)
);

-- Tabla historial_estados
CREATE TABLE historial_estados (
    id_historial SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_admin INT, 
    comentario TEXT,
    CONSTRAINT fk_historial_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_historial_admin
        FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin)
);

-- Tabla revision
CREATE TABLE revision (
    id_revision SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_admin INT NOT NULL,
    fecha_revision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultado VARCHAR(20) NOT NULL,
    observacion TEXT,
    CONSTRAINT fk_revision_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_revision_admin
        FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin)
);

-- Tabla tasignacion
CREATE TABLE asignacion (
    id_asignacion SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL UNIQUE,
    id_locker INT, 
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_asignacion_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_asignacion_locker
        FOREIGN KEY (id_locker)
        REFERENCES locker(id_locker)
);


-- Tabla constancia
-- Esta tabla cumple la funcion de documentos_emitidos
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
    CONSTRAINT fk_constancia_asignacion
        FOREIGN KEY (id_asignacion)
        REFERENCES asignacion(id_asignacion)
);


-- Tabla notificaciones, para cuentas o roles completos
CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20), 
    rol_destino VARCHAR(20), 
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices y reglas
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_activa_por_alumno
ON solicitud (id_alumno, tipo_tramite)
WHERE estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'DOCUMENTACION_INCORRECTA');

CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_activa_por_locker
ON asignacion (id_locker)
WHERE estado = 'ACTIVA' AND id_locker IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_alumno ON solicitud(id_alumno);
CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_estado ON solicitud(estado);
CREATE INDEX IF NOT EXISTS idx_notif_cuenta ON notificaciones(numero_cuenta);
CREATE INDEX IF NOT EXISTS idx_notif_rol ON notificaciones(rol_destino);
-- Busqueda rapida por QR
CREATE INDEX IF NOT EXISTS idx_qr_token ON constancia(qr_token);