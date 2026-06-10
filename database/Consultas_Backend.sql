-- 1. Ver alumnos registrados
SELECT * FROM alumno ORDER BY id_alumno;

-- 2. Buscar alumno por número de cuenta
SELECT * FROM alumno WHERE numero_cuenta = '2173346';

-- 3. Ver lockers disponibles
SELECT * FROM locker WHERE estado = 'DISPONIBLE' ORDER BY codigo_locker;

-- 4. Ver solicitudes pendientes (Incluyendo el tipo de trámite)
SELECT 
    s.id_solicitud,
    s.tipo_tramite,
    a.numero_cuenta,
    a.nombre,
    a.apellidos,
    s.fecha_solicitud,
    s.estado
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
WHERE s.estado = 'PENDIENTE'
ORDER BY s.fecha_solicitud DESC;

-- 5. Ver documentos por solicitud (Actualizado a la tabla 'documentos_solicitud')
SELECT
    s.id_solicitud,
    td.nombre_tipo_documento,
    ds.archivo_path,
    ds.estado,
    ds.comentario,
    ds.fecha_subida
FROM documentos_solicitud ds
JOIN solicitud s ON ds.id_solicitud = s.id_solicitud
JOIN tipo_documento td ON ds.id_tipo_documento = td.id_tipo_documento
WHERE s.id_solicitud = 1; -- Cambia el 1 por el ID que desees consultar

-- 6. Ver historial de solicitudes por alumno (Incluyendo tipo_tramite)
SELECT
    a.numero_cuenta,
    s.id_solicitud,
    s.tipo_tramite,
    s.fecha_solicitud,
    s.estado
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
WHERE a.numero_cuenta = '2173346'
ORDER BY s.fecha_solicitud DESC;

-- 7. Ver asignaciones activas (Compatible con Locker y Estacionamiento)
SELECT 
    ag.id_asignacion,
    a.numero_cuenta,
    s.tipo_tramite,
    l.codigo_locker,
    ag.estado AS estado_asignacion
FROM asignacion ag
JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
JOIN alumno a ON s.id_alumno = a.id_alumno
LEFT JOIN locker l ON ag.id_locker = l.id_locker
WHERE ag.estado = 'ACTIVA'
ORDER BY ag.fecha_asignacion DESC;

-- 8. Ver constancias generadas
SELECT
    c.folio,
    c.fecha_generacion,
    a.numero_cuenta,
    s.tipo_tramite
FROM constancia c
JOIN asignacion ag ON c.id_asignacion = ag.id_asignacion
JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
JOIN alumno a ON s.id_alumno = a.id_alumno
ORDER BY c.fecha_generacion DESC;