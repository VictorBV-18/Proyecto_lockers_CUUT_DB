--DATOS DE PRUEBA ALUMNO
INSERT INTO alumno (numero_cuenta, nombre, apellidos, carrera_abreviatura)
VALUES ('20240001', 'Julian', 'Vazquez', 'ICO');

--DATOS DE PRUEBA admin
INSERT INTO admin (numero_cuenta, nombre, apellidos)
VALUES ('90010001', 'Carlos', 'Ramirez');

--DATOS DE PRUEBA LOCKER
INSERT INTO locker (codigo_locker, ubicacion, estado)
VALUES 
('L-01', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-02', 'Edificio A - Planta Baja', 'DISPONIBLE');

--DATOS DE PRUEBA tipo_documento
INSERT INTO tipo_documento (nombre_tipo_documento, obligatorio)
VALUES
('INE', TRUE),
('Tira de materias', TRUE);

--DATOS DE PRUEBA solicitud
INSERT INTO solicitud (id_alumno, estado, observacion_alumno)
VALUES (1, 'PENDIENTE', 'Solicito locker para este semestre');

--DATOS DE PRUEBA documento
INSERT INTO documento (id_solicitud, id_tipo_documento, nombre_archivo, estado_validacion, comentario_admin)
VALUES
(1, 1, 'ine_julian.pdf', 'PENDIENTE', NULL),
(1, 2, 'tira_materias_julian.pdf', 'PENDIENTE', NULL);

SELECT * FROM documento;

--DATOS DE PRUEBA revision
INSERT INTO revision (id_solicitud, id_admin, resultado, observacion)
VALUES (1, 1, 'APROBADA', 'Documentos correctos');

SELECT * FROM revision;

--DATOS DE PRUEBA asignacion
INSERT INTO asignacion (id_solicitud, id_locker, estado)
VALUES (1, 1, 'ACTIVA');

--ACTUALIZAR EL ESTADO DEL LOCKER a OCUPADO
UPDATE locker
SET estado = 'OCUPADO'
WHERE id_locker = 1;

--DATOS DE PRUEBA constancia
INSERT INTO constancia (id_asignacion, folio)
VALUES (1, 'CONST-2026-001');

--Visualizar TODO EL CONTENIDO DE PRUEBA AGREGADO
SELECT 
    s.id_solicitud,
    a.nombre AS nombre_alumno,
    a.apellidos,
    a.numero_cuenta,
    a.carrera_abreviatura,
    s.estado AS estado_solicitud,
    l.codigo_locker,
    l.ubicacion,
    asig.estado AS estado_asignacion,
    c.folio
FROM solicitud s
JOIN alumno a ON s.id_alumno = a.id_alumno
LEFT JOIN asignacion asig ON s.id_solicitud = asig.id_solicitud
LEFT JOIN locker l ON asig.id_locker = l.id_locker
LEFT JOIN constancia c ON asig.id_asignacion = c.id_asignacion;


--DATOS DE PRUEBA asignacion PARA REVISAR QUE NO SE PUEDE ASIGNAR UN LOCKER OCUPADO 
INSERT INTO asignacion (id_solicitud, id_locker, estado)
VALUES (1, 1, 'ACTIVA');


-- VER TABLAS EXISTENTES
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;