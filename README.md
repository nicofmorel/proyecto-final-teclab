# MedEstudios - Sistema de Gestión de Estudios Médicos

> **Proyecto Final — Materia: Práctica Profesional**  
> **Instituto:** TECLAB  
> **Alumno:** Nicolas Fernandez

---

## Descripción

**MedEstudios** es una aplicación web full-stack para la gestión de estudios médicos. Permite administrar médicos, pacientes y estudios clínicos con un sistema de autenticación basado en roles (Administrador y Médico).

El sistema fue desarrollado como proyecto final de la materia **Práctica Profesional** del **Instituto TECLAB**.

---

## Tecnologías utilizadas

### Backend
| Tecnología | Versión |
|---|---|
| Java | 21 |
| Spring Boot | 3.3.0 |
| Spring Security | (incluido en Spring Boot) |
| JWT (JJWT) | 0.12.3 |
| Lombok | Latest |
| Jackson | Latest |
| Apache Tika | 2.9.1 |
| Maven | 3.x |

### Frontend
| Tecnología | Versión |
|---|---|
| HTML5 / CSS3 / JavaScript (ES6+) | - |
| Bootstrap | 5.3.3 |
| Bootstrap Icons | 1.11.3 |

### Persistencia
- H2 en memoria con JPA

---

## Arquitectura del proyecto

```
proyecto-final-teclab/
├── back/                          # Backend - Spring Boot
│   ├── src/main/java/com/medical/api/
│   │   ├── controller/            # Endpoints REST
│   │   ├── service/               # Lógica de negocio
│   │   ├── repository/            # Repositorios JPA
│   │   ├── model/                 # Entidades del dominio
│   │   ├── dto/                   # Objetos de transferencia
│   │   ├── security/              # JWT y filtros de seguridad
│   │   ├── config/                # Configuración Spring Security y seed de H2
│   │   └── exception/             # Manejo global de errores
│   └── pom.xml
│
└── front/                         # Frontend - HTML/JS/CSS
    ├── index.html                 # Página de login
    ├── admin/                     # Vistas del rol Administrador
    ├── medico/                    # Vistas del rol Médico
    ├── js/                        # Lógica JavaScript
    └── css/                       # Estilos
```

---

## Funcionalidades

### Autenticación
- Login con email y contraseña
- Tokens JWT con expiración de 24 horas
- Redirección automática según el rol del usuario

### Roles

**Administrador (ADMIN)**
- Gestión completa de médicos (CRUD)
- Gestión completa de pacientes
- Gestión completa de estudios médicos
- Vista global del sistema

**Médico (MEDICO)**
- Acceso a sus propios pacientes asignados
- Creación, visualización y exportación a PDF de estudios para sus pacientes
- Carga, descarga y previsualización de archivos adjuntos (PDF, imágenes)

### Entidades principales
- **Médico:** datos personales, matrícula, especialidad, rol y estado
- **Paciente:** datos personales, fecha de nacimiento, médico asignado
- **Estudio:** fecha, nombre, tipo, complejidad, observaciones, paciente, médico, código, detalles y archivo adjunto

### Carga de archivos
- Soporte para adjuntar documentos médicos (PDF, imágenes, etc.)
- Tamaño máximo: 10 MB
- Detección de tipo MIME con Apache Tika

---

## API REST

| Método | Endpoint | Descripción | Rol requerido |
|---|---|---|---|
| POST | `/api/auth/login` | Autenticación | Público |
| GET / POST / PUT / DELETE | `/api/medicos/**` | Gestión de médicos | ADMIN |
| GET / POST / PUT / DELETE | `/api/pacientes/**` | Gestión de pacientes | ADMIN / MEDICO |
| GET / POST / PUT / DELETE | `/api/estudios/**` | Gestión de estudios | ADMIN / MEDICO |
| GET | `/api/estudios/{id}/archivo` | Ver/descargar archivo adjunto | ADMIN / MEDICO |
| GET | `/api/estudios/{id}/pdf` | Exportar resumen a PDF | ADMIN / MEDICO |

---

## Configuración y ejecución

### Requisitos previos
- Java 21 o superior
- Maven 3.x
- Python 3.x para servir el frontend en local

### Pasos para ejecutar el backend

```bash
cd back
mvn spring-boot:run
```

El servidor inicia en `http://localhost:8080`.

### Pasos para ejecutar el frontend

No abrir `front/index.html` directamente con `file://` porque las llamadas a la API fallan por CORS/origen.

La forma recomendada es servir la carpeta `front/`:

```bash
cd front
python3 -m http.server 3000
```

Luego abrir `http://localhost:3000`.

### Levantar backend y frontend juntos

Desde la raíz del proyecto:

```bash
bash scripts/dev.sh
```

El script inicia el backend en `http://localhost:8080` y el frontend en `http://localhost:3000`.

### Variables de configuración (`application.properties`)

```properties
server.port=8080
app.jwt.secret=dev-secret-key-change-in-production-min-32-chars
app.jwt.expiration=86400000
app.data.path=./data
app.upload.path=./uploads
app.upload.max-size=10485760
```

> **Nota:** Para entornos de producción, reemplazar `app.jwt.secret` por una clave segura y aleatoria.

---

## Credenciales de prueba

Los datos de prueba se cargan automáticamente en H2 al iniciar la aplicación.

| Email | Contraseña | Rol | Estado |
|---|---|---|---|
| `admin@medical.com` | `Admin2026!` | ADMIN | Activo |
| `nico@gmail.com` | `Nico2026!` | MEDICO | Activo |
| `prueba@gmail.com` | `Prueba2026!` | MEDICO | Inactivo |
| `juan@medical.com` | `Juan2026!` | MEDICO | Inactivo |

La base se reinicia en cada arranque porque H2 está en memoria.

---

## Seguridad

- Contraseñas hasheadas con **BCrypt**
- Autenticación **stateless** mediante JWT
- CORS configurado para `localhost:3000` y `localhost:8080`
- Autorización por rol en cada endpoint del backend

---

## Estructura de datos (modelos principales)

### Paciente
```json
{
  "id": "uuid",
  "nombre": "string",
  "apellido": "string",
  "fechaNacimiento": "YYYY-MM-DD",
  "mail": "string",
  "telefono": "string",
  "medicoId": "uuid",
  "activo": true
}
```

### Médico
```json
{
  "id": "uuid",
  "nombre": "string",
  "apellido": "string",
  "documento": "string",
  "matricula": "string",
  "especialidad": "string",
  "mail": "string",
  "password": "bcrypt-hash",
  "rol": "ADMIN | MEDICO",
  "activo": true
}
```

### Estudio
```json
{
  "id": "uuid",
  "fecha": "YYYY-MM-DD",
  "nombre": "string",
  "tipoEstudio": "GENERICO | RADIOGRAFIA | ECOGRAFIA | LABORATORIO | TOMOGRAFIA",
  "complejidad": "BAJA | MEDIA | ALTA",
  "observaciones": "string",
  "pacienteId": "uuid",
  "medicoId": "uuid",
  "codigoEstudio": "string",
  "detalles": {
    "clave": "valor"
  },
  "archivoPath": "string | null",
  "activo": true
}
```

---

## Información académica

| Campo | Detalle |
|---|---|
| Institución | TECLAB |
| Materia | Práctica Profesional |
| Tipo | Proyecto Final |
| Alumno | Nicolas Fernandez |
| Año | 2026 |
