# Compará — Prototipo comparador de precios de supermercados

Prototipo web estático (HTML + CSS + JS puro, sin dependencias) para presentar a cliente.

- **Catálogo** con **84 productos con precios REALES** extraídos del sitio oficial de **Tata** (API pública VTEX).
- **Carrito** con control de cantidades y total.
- **Comparación** por supermercado: Tata (con datos) y Tienda Inglesa / Kinko (sin datos públicos).
- **Sugerencia inteligente**: preparada para repartir la compra entre supermercados cuando haya precios de más de uno.

> ⚠️ **Sobre los datos:**
> - **Tata**: precios reales, extraídos de la API pública VTEX (`tatauy.vtexcommercestable.com.br`). El índice público es parcial (84 productos con precio disponible).
> - **Tienda Inglesa**: el sitio bloquea el acceso automatizado (Cloudflare WAF, HTTP 403). No se pueden extraer precios sin evadir esa protección, lo cual no se hace. Para incorporarlos se necesita un acuerdo oficial o una API autorizada.
> - **Kinko**: no publica tienda online con precios (sitio solo corporativo).
> - El nombre "Compará", el logo y la paleta son **provisionales**.

## Estructura

```
appSupermercado/
├── index.html        # Estructura de la página
├── styles.css        # Identidad de marca y estilos
├── app.js            # Catálogo, carrito, comparador y sugerencias
├── data/
│   └── prices.json   # Precios reales (generado por script)
└── README.md
```

## Actualizar precios

El script de extracción está en `.coda/tmp/extract-final.js` (fuera de la carpeta publicable). Para regenerar `data/prices.json`:

```bash
node .coda/tmp/extract-final.js
```

## Ver en local

```bash
# Con Python
python3 -m http.server 8080

# Con Node
npx serve .
```

Luego visitá `http://localhost:8080`. (No abras `index.html` con `file://`: el `fetch` de `data/prices.json` falla por CORS.)

## Publicar en GitHub Pages

### Opción A — Desde la rama (más simple)

1. Creá un repositorio en GitHub (por ejemplo `compara-prototipo`).
2. Subí el contenido de `appSupermercado` a la raíz del repo:

   ```bash
   cd appSupermercado
   git init
   git add .
   git commit -m "Prototipo inicial"
   git branch -M main
   git remote add origin git@github.com:USUARIO/compara-prototipo.git
   git push -u origin main
   ```

3. En GitHub, entrá a **Settings → Pages**.
4. En **Build and deployment → Source**, elegí **Deploy from a branch**.
5. En **Branch**, seleccioná `main` y la carpeta `/ (root)`, y guardá.
6. Esperá 1–2 minutos. La página quedará disponible en:

   ```
   https://USUARIO.github.io/compara-prototipo/
   ```

### Opción B — Con GitHub Actions

1. Subí el repo igual que en la Opción A (pasos 1–2).
2. En **Settings → Pages → Build and deployment → Source**, elegí **GitHub Actions**.
3. Creá el archivo `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy a GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: pages
     cancel-in-progress: true

   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with:
             path: .
         - uses: actions/deploy-pages@v4
           id: deployment
   ```

4. Hacé push y el deploy se ejecuta automáticamente en cada cambio en `main`.

### Notas

- No requiere build ni dependencias: lo que hay en el repo es lo que se publica.
- Las rutas relativas (`styles.css`, `app.js`, `data/prices.json`) funcionan en subpaths de GitHub Pages sin cambios.
- Para dominio propio, configuralo en **Settings → Pages → Custom domain**.
