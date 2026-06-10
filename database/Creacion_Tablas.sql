DROP TABLE IF EXISTS constancia CASCADE;
DROP TABLE IF EXISTS asignacion CASCADE;
DROP TABLE IF EXISTS revision CASCADE;
DROP TABLE IF EXISTS documentos_solicitud CASCADE;
DROP TABLE IF EXISTS solicitud CASCADE;
DROP TABLE IF EXISTS tipo_documento CASCADE;
DROP TABLE IF EXISTS locker CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS alumno CASCADE;

-- 1. ALUMNO
CREATE TABLE alumno (
    id_alumno SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    carrera_abreviatura VARCHAR(10) NOT NULL
);

-- 2. ADMIN
CREATE TABLE admin (
    id_admin SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL
);

-- 3. LOCKER
CREATE TABLE locker (
    id_locker SERIAL PRIMARY KEY,
    codigo_locker VARCHAR(20) UNIQUE NOT NULL,
    ubicacion VARCHAR(120) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
);

-- 4. TIPO_DOCUMENTO (Catálogo para saber el "tipo")
CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre_tipo_documento VARCHAR(60) UNIQUE NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. SOLICITUD
CREATE TABLE solicitud (
    id_solicitud SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    tipo_tramite VARCHAR(50) NOT NULL DEFAULT 'locker' CHECK (tipo_tramite IN ('locker', 'estacionamiento')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    observacion_alumno TEXT,
    CONSTRAINT fk_solicitud_alumno
        FOREIGN KEY (id_alumno)
        REFERENCES alumno(id_alumno)
);

-- 6. DOCUMENTOS_SOLICITUD
CREATE TABLE documentos_solicitud (
    id_documento SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_tipo_documento INT NOT NULL, -- campo "tipo"
    archivo_path VARCHAR(150) NOT NULL, -- Ruta física de la carpeta uploads
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- Estado de validación del documento
    comentario TEXT, -- Comentario del admin si se rechaza
    CONSTRAINT fk_documento_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_documento_tipo
        FOREIGN KEY (id_tipo_documento)
        REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_documento_solicitud_tipo
        UNIQUE (id_solicitud, id_tipo_documento)
);

-- 7. REVISION
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

-- 8. ASIGNACION
CREATE TABLE asignacion (
    id_asignacion SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL UNIQUE,
    id_locker INT, 
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_asignacion_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_asignacion_locker
        FOREIGN KEY (id_locker)
        REFERENCES locker(id_locker)
);

-- 9. CONSTANCIA
CREATE TABLE constancia (
    id_constancia SERIAL PRIMARY KEY,
    id_asignacion INT NOT NULL UNIQUE,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    folio VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT fk_constancia_asignacion
        FOREIGN KEY (id_asignacion)
        REFERENCES asignacion(id_asignacion)
);


-- Regla: Un alumno no puede tener más de una solicitud activa del mismo tipo de trámite.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_activa_por_alumno
ON solicitud (id_alumno, tipo_tramite)
WHERE estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA');

-- Regla: Un locker no puede tener más de una asignación activa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_activa_por_locker
ON asignacion (id_locker)
WHERE estado = 'ACTIVA' AND id_locker IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_alumno ON solicitud(id_alumno);
CREATE INDEX IF NOT EXISTS idx_busqueda_solicitud_estado ON solicitud(estado);

-- VER TABLAS EXISTENTES
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;