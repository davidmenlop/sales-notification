# Sales Notification System

Sistema de notificaciones vía WhatsApp basado en informes comerciales de Excel. Permite crear reglas de alerta personalizadas, gestionar destinatarios y enviar reportes automáticos a ejecutivos de ventas.

## Características

- **Conexión WhatsApp** mediante QR (sin aprobación de Meta, usando Baileys)
- **Lectura de Excel** con estructura agrupada (puntos de venta con múltiples SKUs)
- **Motor de reglas** con soporte para condiciones simples y agregaciones complejas
- **Filtros compuestos** con operadores AND/OR anidados
- **Templates de mensajes** con emojis, formato y variables dinámicas
- **Gestión de destinatarios** con sincronización automática desde Excel
- **Preview de mensajes** antes de enviar
- **Logs en tiempo real** vía Server-Sent Events
- **Frontend moderno** con React, shadcn/ui y Tailwind CSS

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 19 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| WhatsApp | Baileys (@whiskeysockets/baileys) |
| Excel | ExcelJS |
| Templates | Handlebars |
| Validación | Zod |

## Estructura del Proyecto

```
sales-notification/
├── server/                          # Backend
│   ├── index.ts                     # Servidor Express
│   ├── routes/                      # Endpoints API
│   │   ├── rules.ts                 # CRUD de reglas
│   │   ├── recipients.ts            # CRUD de destinatarios
│   │   ├── preview.ts               # Preview de mensajes
│   │   ├── send.ts                  # Envío con SSE
│   │   └── status.ts                # Estado WhatsApp + logout
│   ├── services/
│   │   ├── excel-parser.ts          # Parser de Excel agrupado
│   │   ├── rule-engine.ts           # Motor de reglas
│   │   ├── aggregation-engine.ts    # Motor de agregaciones
│   │   ├── template-engine.ts       # Motor de templates
│   │   └── whatsapp-client.ts       # Cliente WhatsApp (Baileys)
│   └── types/                       # Tipos TypeScript + Zod schemas
├── frontend-react/                  # Frontend React
│   └── src/
│       ├── components/
│       │   ├── Dashboard.tsx        # Dashboard con QR y estado
│       │   ├── SendAlerts.tsx       # Envío de alertas con logs
│       │   └── Recipients.tsx       # Gestión de destinatarios
│       └── api/client.ts            # Cliente API
├── config/
│   ├── alert-rules.json             # Reglas de alertas
│   └── recipients.json              # Destinatarios configurados
├── data/                            # Archivos Excel
└── sessions/                        # Sesión WhatsApp (persistente)
```

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/davidmenlop/sales-notification.git
cd sales-notification

# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend-react && npm install && npm run build && cd ..

# Iniciar servidor
npm start
```

Abre http://localhost:3000 en tu navegador.

## Primer Uso

1. **Escanea el QR** que aparece en el Dashboard con WhatsApp
2. Ve a **Destinatarios** y haz click en **Sincronizar desde Excel**
3. Asocia los números de WhatsApp a cada ejecutivo
4. Ve a **Enviar Alertas**, selecciona reglas y haz click en **Preview**

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/status` | Estado de conexión WhatsApp + QR |
| POST | `/api/status/logout` | Cerrar sesión de WhatsApp |
| GET | `/api/rules` | Listar reglas |
| POST | `/api/rules` | Crear regla |
| PUT | `/api/rules/:id` | Actualizar regla |
| DELETE | `/api/rules/:id` | Eliminar regla |
| GET | `/api/recipients` | Listar destinatarios |
| GET | `/api/recipients/executives` | Ejecutivos desde Excel |
| POST | `/api/recipients/sync` | Sincronizar desde Excel |
| POST | `/api/recipients` | Crear destinatario |
| PUT | `/api/recipients/:name` | Actualizar destinatario |
| DELETE | `/api/recipients/:name` | Eliminar destinatario |
| POST | `/api/preview` | Preview de mensajes |
| POST | `/api/send` | Enviar alertas (SSE) |

## Sistema de Reglas

### Regla de Agregación (Top SKUs no disponibles)

```json
{
  "id": "top-skus-no-disponibles",
  "name": "Top 5 SKUs no disponibles",
  "type": "aggregation",
  "enabled": true,
  "analysis": {
    "group_by_field": "Ejecutivo",
    "filter": {
      "operator": "AND",
      "conditions": [
        { "field": "Disponibilidad", "operator": "equals", "value": "☆" },
        { "field": "% Peso Sku", "operator": "greater_than", "value": 10 }
      ]
    },
    "aggregate": {
      "group_by": "Sku Infaltable",
      "metric": "count",
      "sort": { "field": "count", "order": "desc" },
      "limit": 5
    },
    "calculate_percentage": {
      "denominator": "count_distinct",
      "denominator_field": "ID Punto Venta"
    }
  },
  "message_template": "...",
  "recipients": ["{{Ejecutivo}}"]
}
```

### Operadores Disponibles

| Operador | Descripción |
|----------|-------------|
| `equals` | Igual a |
| `not_equals` | Diferente de |
| `greater_than` | Mayor que |
| `less_than` | Menor que |
| `contains` | Contiene texto |
| `not_contains` | No contiene texto |
| `in` | Está en lista |
| `not_in` | No está en lista |

### Condiciones Compuestas

Las condiciones se pueden combinar con `AND` / `OR` y anidar a múltiples niveles:

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "Disponibilidad", "operator": "equals", "value": "☆" },
    {
      "operator": "OR",
      "conditions": [
        { "field": "% Peso Sku", "operator": "greater_than", "value": 15 },
        { "field": "Clasificacion", "operator": "equals", "value": "Oro" }
      ]
    }
  ]
}
```

### Variables en Templates

- `{{campo}}` - Valor de un campo (ej: `{{Ejecutivo}}`)
- `{{#each items}}...{{/each}}` - Iterar sobre resultados
- `{{count}}` - Conteo de items
- `{{percentage}}` - Porcentaje calculado
- `{{limit}}` - Límite de resultados

## Deploy en Railway

1. Conecta tu repositorio en [Railway](https://railway.app)
2. Configura variables de entorno: `NODE_ENV=production`, `PORT=3000`
3. Agrega un volumen persistente con mount path: `/app/sessions`
4. Railway detectará automáticamente el proyecto Node.js

## Licencia

MIT
