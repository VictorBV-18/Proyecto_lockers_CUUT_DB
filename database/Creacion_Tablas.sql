--Creamos todas las 9 TABLAS que generamos con sus respectivas entidades y atributos.

--ALUMNO
CREATE TABLE alumno (
    id_alumno SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    carrera_abreviatura VARCHAR(10) NOT NULL
);

--ADMIN
CREATE TABLE admin (
    id_admin SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellidos VARCHAR(120) NOT NULL
);

--LOCKER
CREATE TABLE locker (
    id_locker SERIAL PRIMARY KEY,
    codigo_locker VARCHAR(20) UNIQUE NOT NULL,
    ubicacion VARCHAR(120) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
);

--TIPO_DOCUMENTO
CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre_tipo_documento VARCHAR(60) UNIQUE NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE
);

--SOLICITUD
CREATE TABLE solicitud (
    id_solicitud SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    observacion_alumno TEXT,
    CONSTRAINT fk_solicitud_alumno
        FOREIGN KEY (id_alumno)
        REFERENCES alumno(id_alumno)
);

--DOCUMENTO
CREATE TABLE documento (
    id_documento SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_tipo_documento INT NOT NULL,
    nombre_archivo VARCHAR(150) NOT NULL,
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado_validacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    comentario_admin TEXT,
    CONSTRAINT fk_documento_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_documento_tipo
        FOREIGN KEY (id_tipo_documento)
        REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_documento_solicitud_tipo
        UNIQUE (id_solicitud, id_tipo_documento)
);

--REVISION
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

--ASIGNACION
CREATE TABLE asignacion (
    id_asignacion SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL UNIQUE,
    id_locker INT NOT NULL,
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_asignacion_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_asignacion_locker
        FOREIGN KEY (id_locker)
        REFERENCES locker(id_locker)
);

--CONSTANCIA
CREATE TABLE constancia (
    id_constancia SERIAL PRIMARY KEY,
    id_asignacion INT NOT NULL UNIQUE,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    folio VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT fk_constancia_asignacion
        FOREIGN KEY (id_asignacion)
        REFERENCES asignacion(id_asignacion)
);

--REGLAS DE DB con INDEX

-- Un alumno no puede tener más de una solicitud activa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_activa_por_alumno
ON solicitud (id_alumno)
WHERE estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA');

-- Un locker no puede tener más de una asignación activa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_activa_por_locker
ON asignacion (id_locker)
WHERE estado = 'ACTIVA';

--VER TABLAS EXISTENTES
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


