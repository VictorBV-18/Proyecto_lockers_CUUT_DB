-- DATOS DE PRUEBA 
-- 1. DATOS DE PRUEBA: ALUMNO
INSERT INTO alumno (numero_cuenta, nombre, apellidos, carrera_abreviatura)
VALUES 
('2173346', 'Jaime Adrian', 'Ortega Cabrera', 'ICO'),
('20240001', 'Julian', 'Vazquez', 'ICO'),
('20240002', 'Ana', 'Ramirez', 'ICO'),
('20240003', 'Luis', 'Martinez', 'ILI'),
('20240004', 'Pedro', 'Perez', 'ICO'),
('20240005', 'Roman', 'Samora', 'IPI');

-- 2. DATOS DE PRUEBA: ADMIN (Sintaxis corregida)
INSERT INTO admin (numero_cuenta, nombre, apellidos)
VALUES 
('999', 'Jaime Adrian', 'Ortega Cabrera'),
('90010001', 'Carlos', 'Ramirez');

-- 3. DATOS DE PRUEBA: LOCKER
INSERT INTO locker (codigo_locker, ubicacion, estado)
VALUES 
('L-01', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-02', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-03', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-04', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-05', 'Biblioteca - Planta Baja', 'MANTENIMIENTO');

-- 4. DATOS DE PRUEBA: TIPO_DOCUMENTO
INSERT INTO tipo_documento (nombre_tipo_documento, obligatorio)
VALUES
('INE', TRUE),
('Tira de materias', TRUE),
('Tarjeta de Circulación', FALSE),
('Licencia de Conducir', FALSE);

-- 5. DATOS DE PRUEBA: SOLICITUD (Ejemplo con el alumno Julian)
INSERT INTO solicitud (id_alumno, tipo_tramite, estado, observacion_alumno)
VALUES (
    (SELECT id_alumno FROM alumno WHERE numero_cuenta = '20240001'),
    'locker',
    'PENDIENTE',
    'Solicito locker para este semestre'
);

-- 6. DATOS DE PRUEBA: DOCUMENTOS_SOLICITUD
INSERT INTO documentos_solicitud (id_solicitud, id_tipo_documento, archivo_path, estado, comentario)
VALUES
(
    (SELECT id_solicitud FROM solicitud WHERE id_alumno = (SELECT id_alumno FROM alumno WHERE numero_cuenta = '20240001') LIMIT 1),
    (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipo_documento = 'INE'),
    'ine_julian.pdf',
    'PENDIENTE',
    NULL
),
(
    (SELECT id_solicitud FROM solicitud WHERE id_alumno = (SELECT id_alumno FROM alumno WHERE numero_cuenta = '20240001') LIMIT 1),
    (SELECT id_tipo_documento FROM tipo_documento WHERE nombre_tipo_documento = 'Tira de materias'),
    'tira_materias_julian.pdf',
    'PENDIENTE',
    NULL
);

-- 7. DATOS DE PRUEBA: REVISION
INSERT INTO revision (id_solicitud, id_admin, resultado, observacion)
VALUES (
    (SELECT s.id_solicitud FROM solicitud s JOIN alumno a ON s.id_alumno = a.id_alumno WHERE a.numero_cuenta = '20240001' LIMIT 1),
    (SELECT id_admin FROM admin WHERE numero_cuenta = '90010001'),
    'APROBADA',
    'Documentos correctos'
);

-- 8. DATOS DE PRUEBA: ASIGNACION
INSERT INTO asignacion (id_solicitud, id_locker, estado)
VALUES (
    (SELECT s.id_solicitud FROM solicitud s JOIN alumno a ON s.id_alumno = a.id_alumno WHERE a.numero_cuenta = '20240001' LIMIT 1),
    (SELECT id_locker FROM locker WHERE codigo_locker = 'L-01'),
    'ACTIVA'
);

-- 9. ACTUALIZAR ESTADO DEL LOCKER
UPDATE locker
SET estado = 'OCUPADO'
WHERE codigo_locker = 'L-01';

-- 10. DATOS DE PRUEBA: CONSTANCIA
INSERT INTO constancia (id_asignacion, folio)
VALUES (
    (SELECT ag.id_asignacion
     FROM asignacion ag
     JOIN solicitud s ON ag.id_solicitud = s.id_solicitud
     JOIN alumno a ON s.id_alumno = a.id_alumno
     WHERE a.numero_cuenta = '20240001'
     LIMIT 1),
    'CONST-2026-001'
);

-- 11. VISUALIZAR RESULTADO FINAL
SELECT 
    s.id_solicitud,
    a.nombre AS nombre_alumno,
    a.apellidos,
    a.numero_cuenta,
    s.tipo_tramite,
    s.estado AS estado_solicitud,
    l.codigo_locker,
    asig.estado AS estado_asignacion,
    c.folio
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
LEFT JOIN asignacion asig ON s.id_solicitud = asig.id_solicitud
LEFT JOIN locker l ON asig.id_locker = l.id_locker
LEFT JOIN constancia c ON asig.id_asignacion = c.id_asignacion;