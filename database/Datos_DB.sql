INSERT INTO tipo_documento (nombre_tipo_documento, obligatorio, tramite_asociado)
VALUES
('Credencial UAEMex', TRUE, 'ambos'),
('Tira de materias', TRUE, 'ambos'),
('Tarjeta de Circulación', TRUE, 'estacionamiento'),
('Licencia de Conducir', TRUE, 'estacionamiento');

INSERT INTO locker (codigo_locker, ubicacion, estado)
VALUES 
('L-01', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-02', 'Edificio A - Planta Baja', 'DISPONIBLE'),
('L-03', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-04', 'Edificio B - Primer Piso', 'DISPONIBLE'),
('L-05', 'Biblioteca - Planta Baja', 'MANTENIMIENTO');