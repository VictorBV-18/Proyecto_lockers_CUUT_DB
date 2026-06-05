# Endpoints propuestos para el backend

## Login
POST /login/?numero_cuenta={numero_cuenta}

Valida si el alumno existe en la base de datos.

## Alumnos
GET /alumnos

Obtiene todos los alumnos registrados.

GET /alumnos/{numero_cuenta}

Obtiene un alumno específico por número de cuenta.

## Lockers
GET /lockers

Obtiene todos los lockers.

GET /lockers/disponibles

Obtiene únicamente lockers con estado DISPONIBLE.

GET /lockers/ocupados

Obtiene lockers con estado OCUPADO.

## Solicitudes
GET /solicitudes

Obtiene todas las solicitudes.

GET /solicitudes/pendientes

Obtiene solicitudes con estado PENDIENTE.

GET /solicitudes/alumno/{numero_cuenta}

Obtiene el historial de solicitudes de un alumno.

POST /solicitudes

Crea una solicitud nueva para un alumno.

## Documentos
GET /documentos/solicitud/{id_solicitud}

Obtiene los documentos asociados a una solicitud.

PUT /documentos/{id_documento}/validar

Actualiza el estado de validación de un documento.

## Asignaciones
GET /asignaciones/activas

Obtiene las asignaciones activas con datos del alumno y locker.

POST /asignaciones

Asigna un locker a una solicitud aprobada.

## Constancias
GET /constancias

Obtiene las constancias generadas.

POST /constancias

Genera una constancia para una asignación activa.