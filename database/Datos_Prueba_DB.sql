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


INSERT INTO alumno (numero_cuenta, nombre, apellidos, carrera, correo_electronico, contrasena_hash, estado_activo)
VALUES 
('2173346', 'Jaime Adrian', 'Ortega Cabrera', 'Licenciatura en Ingeniería en Computación', 'jortegac006@alumno.uaemex.mx', '$2b$12$hXGLH4SuVZN/WryQZm4WXOEsAw1pxcU5sxJ8I8mTk0s0lUpnZswVe', TRUE);





INSERT INTO admin (numero_cuenta, nombre, apellidos, correo_electronico, contrasena_hash, rol, estado_activo)
VALUES 
('999', 'Administrador', '1', 'admin@uaemex.mx', '$2b$12$tE60XXvSQkD9BBW/Jzv0aOFiFzFEaZBzNAdX/8bRrmmPQQACpIcly', 'ADMIN', TRUE),
('888', 'Personal', '2', 'personal@uaemex.mx', '$2b$12$lv93/xp0v.1qpFpvGKvLDeiaYcXl0sFUAIc2UQsqXK2gfO8gLI.8O', 'REVISOR', TRUE),
('777', 'Guardia', '3', 'NULL', '$2b$12$KkJgbBCcJdlQvJdzCY8.9esNKmoHWprKDrVrDd61rC62N3NBnVSXC', 'VIGILANTE', TRUE);