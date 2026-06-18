# Directrices del Proyecto - Medical API

Este archivo define las convenciones y estándares para el desarrollo del proyecto.

## Arquitectura
- **Backend:** Java, Spring Boot. Estructura organizada por capas: `controller`, `service`, `repository`, `model`, `dto`, `security`, `exception`.
- **Frontend:** HTML, CSS, JavaScript (Vanilla). Estructura organizada por funcionalidades: `admin/` y `medico/`.

## Convenciones de Código
- **Java:** Seguir las convenciones de nomenclatura de Java (CamelCase para clases y métodos).
- **Frontend:** Utilizar funciones asíncronas para llamadas a la API (`async/await` con `fetch`). Mantener los archivos de lógica separados por entidad (`estudios.js`, `medicos.js`, `pacientes.js`).

## Testing
- Se requiere añadir tests unitarios para toda nueva lógica de negocio introducida en el backend.
- Se debe validar que los cambios no rompan la integridad de la API.

## Flujo de Trabajo
- Antes de realizar cambios, investigar la estructura existente.
- Siempre validar los cambios con las herramientas disponibles (compilación, linters, pruebas manuales).
- No realizar refactorizaciones no solicitadas.
