-- Consultas Basicas en Backend- SISTEMA LOCKERS CUUT


-- Ver alumnos registrados
SELECT *
FROM alumno
ORDER BY id_alumno;

-- Buscar alumno por número de cuenta
SELECT *
FROM alumno
WHERE numero_cuenta = '20240001';

-- Ver lockers disponibles
SELECT *
FROM locker
WHERE estado = 'DISPONIBLE'
ORDER BY codigo_locker;

-- Ver lockers ocupados
SELECT *
FROM locker
WHERE estado = 'OCUPADO'
ORDER BY codigo_locker;

-- Ver lockers en mantenimiento
SELECT *
FROM locker
WHERE estado = 'MANTENIMIENTO'
ORDER BY codigo_locker;

-- Ver solicitudes pendientes
SELECT 
    s.id_solicitud,
    a.numero_cuenta,
    a.nombre,
    a.apellidos,
    a.carrera_abreviatura,
    s.fecha_solicitud,
    s.estado,
    s.observacion_alumno
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
WHERE s.estado = 'PENDIENTE'
ORDER BY s.fecha_solicitud DESC;

-- Ver documentos por solicitud
SELECT
    s.id_solicitud,
    td.nombre_tipo_documento,
    d.nombre_archivo,
    d.estado_validacion,
    d.comentario_admin,
    d.fecha_subida
FROM documento d
JOIN solicitud s ON d.id_solicitud = s.id_solicitud
JOIN tipo_documento td ON d.id_tipo_documento = td.id_tipo_documento
WHERE s.id_solicitud = (
    SELECT s2.id_solicitud
    FROM solicitud s2
    JOIN alumno a ON s2.id_alumno = a.id_alumno
    WHERE a.numero_cuenta = '20240001'
    LIMIT 1
);

-- Ver historial de solicitudes por alumno
SELECT
    a.numero_cuenta,
    a.nombre,
    a.apellidos,
    s.id_solicitud,
    s.fecha_solicitud,
    s.estado,
    s.observacion_alumno
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
WHERE a.numero_cuenta = '20240001'
ORDER BY s.fecha_solicitud DESC;

-- Ver asignaciones activas con alumno y locker
SELECT 
    ag.id_asignacion,
    a.numero_cuenta,
    a.nombre,
    a.apellidos,
    l.codigo_locker,
    l.ubicacion,
    ag.fecha_asignacion,
    ag.estado AS estado_asignacion
FROM asignacion ag
JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
JOIN alumno a ON s.id_alumno = a.id_alumno
JOIN locker l ON ag.id_locker = l.id_locker
WHERE ag.estado = 'ACTIVA'
ORDER BY ag.fecha_asignacion DESC;

-- Ver constancias generadas
SELECT
    c.folio,
    c.fecha_generacion,
    a.numero_cuenta,
    a.nombre,
    a.apellidos,
    l.codigo_locker,
    l.ubicacion
FROM constancia c
JOIN asignacion ag ON c.id_asignacion = ag.id_asignacion
JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
JOIN alumno a ON s.id_alumno = a.id_alumno
JOIN locker l ON ag.id_locker = l.id_locker
ORDER BY c.fecha_generacion DESC;