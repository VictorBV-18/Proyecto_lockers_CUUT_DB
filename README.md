# Proyecto Lockers - Base de Datos

Este repositorio contiene el primer avance de la base de datos para un sistema de asignación de lockers universitarios.

## Contenido

- `docs/der_lockers_UAPT.pdf`: versión en PDF del diagrama entidad-relación.
- `dbml/der_lockers_UAPT.sql`: código fuente del diagrama en formato sql.
- `sql/Creacion_Tablas.sql`: crea tablas, relaciones e índices.
- `sql/Datos_Prueba_Lockers.sql`: inserta datos de prueba y simula el flujo principal.

## Enlace del diagrama

https://dbdiagram.io/d/DER-Lockers-UAPT-69e9b369d80a958d1cbb2397

## Entidades principales

- alumno
- admin
- locker
- tipo_documento
- solicitud
- documento
- revision
- asignacion
- constancia

## Reglas implementadas

- Un alumno no puede tener más de una solicitud activa.
- Un locker no puede tener más de una asignación activa.

## Orden de ejecución

1. Ejecutar `Creacion_Tablas.sql`
2. Ejecutar `Datos_Prueba_Lockers.sql`

## Motor utilizado

PostgreSQL 17