# VALORANT Pro Backend

Proyecto completo con frontend + backend.

## Incluye
- Página de mapas
- Tier list
- Página para calcular pickrates
- Backend Node.js + Express
- Valorant-API para agentes, mapas e imágenes
- HenrikDev para partidas y pickrates si agregas API key
- Datos demo si no configuras key
- Imágenes locales: `veto.gif` y `miks.jpg`

## Correr local

```bash
npm install
cp .env.example .env
npm start
```

Abre:

```txt
http://localhost:8080
```

## Usar HenrikDev real

Edita `.env`:

```env
HENRIK_API_KEY=TU_KEY_AQUI
```

Luego reinicia el servidor.

## Endpoints

```txt
GET /api/health
GET /api/content
GET /api/pickrates/:region/:name/:tag?size=10
```

Ejemplo:

```txt
/api/pickrates/latam/Paz/1234?size=10
```

## Deploy

Netlify sirve el frontend estatico, pero no corre este backend Node/Express tal cual. El backend va en Render.

### Backend en Render

1. Sube el proyecto a GitHub.
2. En Render crea `New -> Web Service`.
3. Conecta el repositorio.
4. Configura:

```txt
Build Command: npm install
Start Command: npm start
```

5. Agrega estas variables de entorno:

```env
HENRIK_API_KEY=tu_key
PORT=8080
```

Render entregara una URL parecida a:

```txt
https://valorant-backend.onrender.com
```

### Frontend en Netlify

Este repo incluye `netlify.toml` para publicar la carpeta `public`.

Antes de desplegar en Netlify, edita `public/config.js` y pon la URL real de Render:

```js
window.VALORANT_API_BASE_URL = "https://valorant-backend.onrender.com";
```

Para desarrollo local dejalo vacio:

```js
window.VALORANT_API_BASE_URL = "";
```


## Nuevo
- Tarjeta del jugador en Pickrates API: Riot ID, rango, winrate, KDA, partidas, main agent y mejores mapas.


## Tracker Lite
- Nueva pantalla Pickrates API rediseñada como perfil competitivo tipo tracker.
- Incluye resumen, últimas partidas, agentes y mapas.
- Se eliminan Veto/Miks de estadísticas reales.


## Rango real
El backend consulta HenrikDev MMR v3: `/valorant/v3/mmr/{region}/pc/{name}/{tag}` para mostrar rango, RR y ELO cuando la API lo devuelve.


## Patch update
- Tier list y picks por mapa actualizados para Patch 12.10 / V26 Act 3.
- Map pool competitivo usado: Ascent, Breeze, Fracture, Haven, Lotus, Pearl y Split.


## Ajuste de tier
- Clove fue bajada de S Tier a A Tier.
