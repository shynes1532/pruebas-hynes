# WhatsApp Concesionario Bot

Chatbot de WhatsApp para concesionario de autos nuevos, con panel de administracion web para gestionar leads, citas, cotizaciones y conversaciones.

## Funcionalidades

### Bot de WhatsApp
- **Catalogo interactivo**: Explorar vehiculos por categoria (Sedan, SUV, Pickup, Hatchback) con fichas tecnicas y precios
- **Agendamiento de citas**: Test drives, visitas al salon y servicio tecnico con seleccion de fecha y horario
- **Cotizaciones automaticas**: Calculo de financiamiento con diferentes anticipos y plazos (12 a 60 cuotas)
- **Preguntas frecuentes**: Respuestas sobre financiamiento, garantia, test drive, entregas y toma de usados
- **Menu interactivo**: Botones y listas de WhatsApp para navegacion facil

### Panel de Administracion (Dashboard)
- **Dashboard**: Estadisticas generales (leads, citas, cotizaciones, mensajes del dia)
- **Leads**: Lista de contactos con estado, notas y vehiculo de interes
- **Conversaciones**: Historial completo de cada chat con vista estilo WhatsApp
- **Citas**: Gestion de turnos con cambio de estado
- **Cotizaciones**: Todas las cotizaciones generadas con detalles de financiamiento
- **Vehiculos**: Catalogo de vehiculos cargados en el sistema

## Requisitos

- Node.js 18 o superior
- Cuenta de WhatsApp Business API (Meta Cloud API)

## Instalacion

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus datos:

```
WHATSAPP_TOKEN=tu_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WEBHOOK_VERIFY_TOKEN=un_token_que_vos_elijas

DEALER_NAME=Tu Concesionario
DEALER_PHONE=+54 11 1234-5678
DEALER_ADDRESS=Av. Ejemplo 1234, Buenos Aires
DEALER_HOURS=Lunes a Viernes 9:00 a 18:00

ADMIN_USER=admin
ADMIN_PASSWORD=tu_password_seguro
```

### 3. Cargar datos de ejemplo

```bash
npm run seed
```

Carga 12 vehiculos de ejemplo (Toyota, Volkswagen, Chevrolet, Ford).

### 4. Iniciar el servidor

```bash
npm start
```

El servidor arranca en `http://localhost:3000`.

### 5. Configurar Webhook en Meta

1. Ir a Meta for Developers (developers.facebook.com)
2. En tu app, ir a WhatsApp > Configuracion
3. Configurar el webhook:
   - **URL**: `https://tu-dominio.com/webhook`
   - **Token de verificacion**: El mismo que pusiste en `WEBHOOK_VERIFY_TOKEN`
4. Suscribirse al campo `messages`

Para desarrollo local podes usar ngrok:
```bash
ngrok http 3000
```

## Uso

### Panel de Administracion
Acceder a `http://localhost:3000/admin`

Usuario y password configurados en `.env` (por defecto: admin / admin123).

### Flujo del Bot

Cuando un cliente escribe al numero de WhatsApp:

1. Recibe un **menu principal** con botones interactivos
2. Puede elegir:
   - **Ver Catalogo** - Categorias - Modelos - Ficha tecnica - Cotizar/Agendar
   - **Agendar Cita** - Tipo - Nombre - Fecha - Horario - Confirmacion
   - **Cotizar** - Modelo - Nombre - Anticipo - Cuotas - Cotizacion detallada
   - **Preguntas Frecuentes** - Lista de temas - Respuesta
   - **Contacto** - Datos del concesionario

El cliente puede escribir **menu** en cualquier momento para volver al menu principal.

## Estructura del Proyecto

```
src/
  index.js              # Servidor Express principal
  seed.js               # Script para cargar datos de ejemplo
  controllers/
    conversation.js     # Controller principal de conversaciones
  flows/
    menu.js             # Menu principal y navegacion
    catalog.js          # Flujo de catalogo de vehiculos
    appointment.js      # Flujo de agendamiento de citas
    quote.js            # Flujo de cotizacion y financiamiento
    faq.js              # Preguntas frecuentes
  models/
    database.js         # SQLite database y esquema
  routes/
    webhook.js          # Webhook de WhatsApp
    admin.js            # Rutas del panel admin
    api.js              # API para acciones del panel
  services/
    whatsapp.js         # Cliente de WhatsApp Cloud API
views/                  # Vistas EJS del panel admin
public/                 # CSS y JS del panel admin
data/                   # Base de datos SQLite (auto-generada)
```

## Personalizacion

- **Vehiculos**: Editar `src/seed.js` o la DB directamente
- **Preguntas frecuentes**: Editar `FAQS` en `src/flows/faq.js`
- **Planes de financiamiento**: Editar `FINANCING_OPTIONS` en `src/flows/quote.js`
- **Horarios de turnos**: Editar `TIME_SLOTS` en `src/flows/appointment.js`

## Tecnologias

- Node.js + Express
- SQLite (better-sqlite3) - sin servidor de DB externo
- EJS - templates del panel admin
- WhatsApp Cloud API (Meta) - mensajes interactivos
