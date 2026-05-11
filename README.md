# La Ruleta de la Integración

Pequeña web con una ruleta visual para sorteos. Permite añadir participantes, girar con una duración configurable y mantener una lista ordenada de ganadores. Los ganadores **salen de la ruleta** para que no se repitan.

## Stack

- **Backend**: Node.js usando solo módulos nativos (`node:http`, `node:fs`). **Cero dependencias de npm**.
- **Frontend**: HTML + CSS + JavaScript vanilla (módulos ES) con `<canvas>` para la ruleta.

## Requisitos

- Node.js 18 o superior. Nada más: no hace falta `npm install`.

## Arranque

```bash
npm start
# o, equivalente:
node server.js
```

Después abre [http://localhost:3000](http://localhost:3000).

Por defecto el servidor escucha solo en `127.0.0.1`, así que **nadie más en tu red podrá acceder**. Si quieres exponerlo al LAN (por ejemplo para demo con varios dispositivos), arranca con:

```bash
HOST=0.0.0.0 node server.js
```

## Deploy en Render

El servidor detecta automáticamente que está en Render (variable `RENDER=true`) o en `NODE_ENV=production` y **bindea a `0.0.0.0`** sin que tengas que tocar nada. Configuración en el dashboard de Render:

- **Build Command**: `npm install` (o vacío — no hay dependencias)
- **Start Command**: `npm start`
- **Environment**: Node

Render inyecta su propia variable `PORT`, que el server ya respeta. Para disparar un deploy:

```bash
make push
```

Para desarrollo con recarga automática del servidor cuando edites archivos:

```bash
npm run dev
```

## Uso

1. Añade participantes en el panel izquierdo (escribe el nombre y pulsa **Añadir** o Enter).
2. Ajusta la **duración del giro** (segundos) y, si quieres, desactiva el toggle "Eliminar ganador de la ruleta".
3. Pulsa **Girar**. Cuando la ruleta se detenga, el ganador aparecerá en la lista numerada de la derecha y (por defecto) saldrá de la ruleta.
4. Repite hasta agotar participantes. Pulsa **Reiniciar todo** para empezar de cero.

## Estructura

```
.
├── package.json
├── server.js
└── public/
    ├── index.html
    ├── styles.css
    └── js/
        ├── main.js
        └── wheel.js
```
