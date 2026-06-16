
-- Datos de prueba
INSERT INTO alumno (numero_cuenta, nombre, apellidos, carrera_abreviatura, correo_electronico)
VALUES 
('2173346', 'Jaime Adrian', 'Ortega Cabrera', 'ICO', 'jaocjaime@gmail.com');


-- Por el momento solo hay 3 personas en cada rol para cualquier prueba
INSERT INTO admin (numero_cuenta, nombre, apellidos, rol)
VALUES 
('999', 'Administrador', 'Propietario', 'ADMIN'),
('888', 'Personal 1', 'Docente', 'REVISOR'),
('777', 'Guardia 1', 'Encargado', 'VIGILANTE');


-- Catalogo de todos los documentos necesarios para el sistema
INSERT INTO tipo_documento (nombre_tipo_documento, obligatorio, tramite_asociado)
VALUES
('Credencial UAEMex', TRUE, 'ambos'),
('Tira de materias', TRUE, 'ambos'),
('Tarjeta de Circulación', TRUE, 'estacionamiento'),
('Licencia de Conducir', TRUE, 'estacionamiento');


-- Datos de prueba para lockers
INSERT INTO locker (codigo_locker, ubicacion, estado)
VALUES 
('L-01', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-02', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-03', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-04', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-05', 'Biblioteca - Planta Baja', 'MANTENIMIENTO');