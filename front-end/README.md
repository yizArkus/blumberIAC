# Front-end · Top animes más vistos

UI en React que muestra el **top de animes más vistos en los últimos dos años**, con imágenes. Usa la API pública [Jikan](https://jikan.moe/) (MyAnimeList).

## Cómo ejecutar

```bash
cd front-end
npm install
npm run dev
```

Abre en el navegador la URL que muestre Vite (por ejemplo `http://localhost:5173`).

## Scripts

- `npm run dev` – servidor de desarrollo
- `npm run build` – build para producción
- `npm run preview` – vista previa del build

## Estructura

- `src/App.jsx` – página principal y grid de animes
- `src/AnimeCard.jsx` – tarjeta con imagen, título, año y puntuación
- `src/api.js` – llamadas a Jikan API v4 (top por popularidad, filtro por año)
