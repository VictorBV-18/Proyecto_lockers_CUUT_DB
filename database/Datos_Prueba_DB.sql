-- ==============================================================================
-- TIPOS DE DOCUMENTO
-- ==============================================================================
INSERT INTO tipo_documento (nombre_tipo_documento, obligatorio, tramite_asociado)
VALUES
('Credencial UAEMex', TRUE, 'ambos'),
('Tira de materias', TRUE, 'ambos'),
('Tarjeta de Circulación', TRUE, 'estacionamiento'),
('Licencia de Conducir', TRUE, 'estacionamiento')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- LOCKERS
-- ==============================================================================
INSERT INTO locker (codigo_locker, ubicacion, estado)
VALUES 
('L-01', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-02', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-03', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-04', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-05', 'Biblioteca - Planta Baja', 'MANTENIMIENTO')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- ALUMNO (Contraseña: 123456)
-- ==============================================================================
INSERT INTO alumno (numero_cuenta, nombre, apellidos, carrera, correo_electronico, contrasena_hash, estado_activo)
VALUES 
('2173346', 'Jaime Adrian', 'Ortega Cabrera', 'Licenciatura en Ingeniería en Computación', 'jortegac006@alumno.uaemex.mx', '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u', TRUE)
ON CONFLICT (numero_cuenta) DO UPDATE 
SET contrasena_hash = '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u',
    correo_electronico = EXCLUDED.correo_electronico,
    estado_activo = TRUE;

-- ==============================================================================
-- ADMINISTRADORES Y PERSONAL (Contraseña: 123456)
-- ==============================================================================
INSERT INTO admin (numero_cuenta, nombre, apellidos, correo_electronico, contrasena_hash, rol, estado_activo)
VALUES 
('999', 'Administrador', '1', 'admin@uaemex.mx', '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u', 'ADMIN', TRUE),
('888', 'Personal', '2', 'personal@uaemex.mx', '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u', 'REVISOR', TRUE),
('777', 'Guardia', '3', NULL, '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u', 'VIGILANTE', TRUE)
ON CONFLICT (numero_cuenta) DO UPDATE 
SET contrasena_hash = '$2b$12$eX8m6b89rWwU3Kj7FjRjVuqE0l05P0H6Z7x6/Jk69yJ3.o1u3Fq7u',
    correo_electronico = EXCLUDED.correo_electronico,
    rol = EXCLUDED.rol,
    estado_activo = TRUE;

-- ==============================================================================
-- ACCESOS DENEGADOS (STRIKES DE PRUEBA PARA AUDITORÍA)
-- ==============================================================================
INSERT INTO acceso_denegado (id_alumno, motivo, fecha_intento)
VALUES 
(
    (SELECT id_alumno FROM alumno WHERE numero_cuenta = '2173346'),
    'Intento de acceso fuera de horario permitido',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    (SELECT id_alumno FROM alumno WHERE numero_cuenta = '2173346'),
    'Credencial no vigente o sin autorización en caseta',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    (SELECT id_alumno FROM alumno WHERE numero_cuenta = '2173346'),
    'Tarjetón no coincide con placas registradas',
    CURRENT_TIMESTAMP
);