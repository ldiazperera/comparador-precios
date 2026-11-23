/* ============================================================
   Compará — Lógica del prototipo (solo precios REALES)
   - Carga data/prices.json (extraído del sitio oficial de Tata).
   - Tienda Inglesa y Kinko: sin datos públicos disponibles
     (TI bloquea acceso automatizado; Kinko no tiene tienda online).
   ============================================================ */

'use strict';

/* ================= SUPERMERCADOS ================= */
const SUPERMERCADOS = [
  { id: 'tata',           nombre: 'Tata',           color: 'var(--sm-tata)',           conDatos: true },
  { id: 'tienda-inglesa', nombre: 'Tienda Inglesa', color: 'var(--sm-tienda-inglesa)', conDatos: false },
  { id: 'kinko',          nombre: 'Kinko',          color: 'var(--sm-kinko)',          conDatos: false },
];

const EMOJIS_CATEGORIA = {
  almacen: '🛒',
  bebidas: '🥤',
  carnes: '🥩',
  lacteos: '🥛',
  verduleria: '🥬',
};

/* ================= ESTADO ================= */
let PRODUCTOS = [];
let carrito = {}; // { idProducto: cantidad }
let categoriaActual = 'all';
let textoBusqueda = '';

/* ================= UTILIDADES ================= */
const $ = (selector) => document.querySelector(selector);

function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(valor);
}

function obtenerProducto(id) {
  return PRODUCTOS.find((p) => p.id === id);
}

/* ================= CARGA DE DATOS ================= */
async function cargarPrecios() {
  const res = await fetch('data/prices.json');
  if (!res.ok) throw new Error('No se pudo cargar data/prices.json');
  const data = await res.json();
  PRODUCTOS = data.productos || [];
  return data;
}

/* ================= RENDER CATÁLOGO ================= */
function renderCatalogo() {
  const grid = $('#product-grid');
  const vacio = $('#catalog-empty');

  const filtrados = PRODUCTOS.filter((p) => {
    const coincideCategoria = categoriaActual === 'all' || p.categoria === categoriaActual;
    const coincideBusqueda =
      !textoBusqueda ||
      p.nombre.toLowerCase().includes(textoBusqueda) ||
      p.categoria.toLowerCase().includes(textoBusqueda);
    return coincideCategoria && coincideBusqueda;
  });

  grid.innerHTML = filtrados.map((producto) => {
    const emoji = EMOJIS_CATEGORIA[producto.categoria] || '📦';
    return `
      <article class="product-card" data-id="${producto.id}">
        <div class="product-emoji">${emoji}</div>
        <div>
          <div class="product-name">${producto.nombre}</div>
          <div class="product-unit">${producto.unidad}</div>
        </div>
        <div class="product-price-main">
          <span class="sm-name">Tata</span>
          <span class="price">${formatearPrecio(producto.precio)}</span>
        </div>
        <div class="product-actions">
          <button class="btn-add" type="button" data-add="${producto.id}">Agregar</button>
        </div>
      </article>`;
  }).join('');

  vacio.hidden = filtrados.length > 0;
}

/* ================= RENDER CARRITO ================= */
function renderCarrito() {
  const lista = $('#cart-list');
  const vacio = $('#cart-empty');
  const badge = $('#cart-badge');

  const ids = Object.keys(carrito);
  vacio.hidden = ids.length > 0;
  lista.innerHTML = '';

  let totalItems = 0;
  let totalGeneral = 0;

  ids.forEach((id) => {
    const producto = obtenerProducto(id);
    if (!producto) return;
    const cantidad = carrito[id];
    totalItems += cantidad;
    totalGeneral += producto.precio * cantidad;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${producto.nombre}</div>
        <div class="cart-item-price">${producto.unidad} · ${formatearPrecio(producto.precio)} c/u</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" type="button" data-dec="${id}" aria-label="Quitar uno">−</button>
        <span class="qty-value">${cantidad}</span>
        <button class="qty-btn" type="button" data-inc="${id}" aria-label="Agregar uno">+</button>
      </div>
      <button class="cart-item-remove" type="button" data-remove="${id}" aria-label="Eliminar del carrito">✕</button>`;
    lista.appendChild(li);
  });

  badge.hidden = totalItems === 0;
  badge.textContent = String(totalItems);

  const totalEl = $('#cart-total');
  if (totalEl) {
    totalEl.hidden = totalItems === 0;
    totalEl.textContent = `Total: ${formatearPrecio(totalGeneral)}`;
  }
}

/* ================= COMPARADOR ================= */
function renderComparador() {
  const contenedor = $('#compare-results');
  const mejorOpcion = $('#best-option');
  const mejorOpcionValor = $('#best-option-value');

  if (Object.keys(carrito).length === 0) {
    contenedor.innerHTML = '<p class="empty-state">Agregá productos para ver la comparación.</p>';
    mejorOpcion.hidden = true;
    return;
  }

  // Solo Tata tiene precios reales por ahora.
  let totalTata = 0;
  Object.keys(carrito).forEach((id) => {
    const producto = obtenerProducto(id);
    if (producto) totalTata += producto.precio * carrito[id];
  });

  contenedor.innerHTML = SUPERMERCADOS.map((sm) => {
    if (sm.conDatos) {
      return `
        <div class="compare-row winner">
          <span class="compare-sm">
            <span class="sm-dot" style="background:${sm.color}"></span>
            ${sm.nombre}
          </span>
          <div class="compare-bar-track">
            <div class="compare-bar" style="width:100%;background:${sm.color}"></div>
          </div>
          <span class="compare-total">${formatearPrecio(totalTata)}</span>
        </div>`;
    }
    return `
      <div class="compare-row nodata">
        <span class="compare-sm">
          <span class="sm-dot" style="background:${sm.color}"></span>
          ${sm.nombre}
        </span>
        <div class="compare-bar-track">
          <span class="nodata-label">sin datos públicos</span>
        </div>
        <span class="compare-total">—</span>
      </div>`;
  }).join('');

  mejorOpcion.hidden = false;
  mejorOpcionValor.textContent = `Tata — ${formatearPrecio(totalTata)}`;
}

/* ================= SUGERENCIA INTELIGENTE ================= */
function renderSugerenciaInteligente() {
  const contenedor = $('#smart-suggestion');

  if (Object.keys(carrito).length === 0) {
    contenedor.innerHTML = '<p class="empty-state">Agregá productos para ver la sugerencia.</p>';
    return;
  }

  contenedor.innerHTML = `
    <div class="split-savings">
      Con los datos públicos disponibles hoy, todo tu carrito sale más barato en
      <strong>Tata</strong>. Cuando incorporemos precios de Tienda Inglesa y Kinko
      (vía acuerdos o APIs oficiales), esta sección sugerirá automáticamente cómo
      repartir la compra entre supermercados para lograr el máximo ahorro.
    </div>`;
}

/* ================= EVENTOS ================= */
function configurarEventos() {
  $('#product-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (btn) {
      const id = btn.dataset.add;
      carrito[id] = (carrito[id] || 0) + 1;
      renderCarrito();
      renderComparador();
      renderSugerenciaInteligente();
    }
  });

  $('#cart-list').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const remove = e.target.closest('[data-remove]');

    if (inc) {
      carrito[inc.dataset.inc] += 1;
    } else if (dec) {
      const id = dec.dataset.dec;
      carrito[id] -= 1;
      if (carrito[id] <= 0) delete carrito[id];
    } else if (remove) {
      delete carrito[remove.dataset.remove];
    } else {
      return;
    }
    renderCarrito();
    renderComparador();
    renderSugerenciaInteligente();
  });

  $('#category-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    categoriaActual = chip.dataset.category;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderCatalogo();
  });

  $('#search-input').addEventListener('input', (e) => {
    textoBusqueda = e.target.value.trim().toLowerCase();
    renderCatalogo();
  });

  $('#btn-clear-cart').addEventListener('click', () => {
    carrito = {};
    renderCarrito();
    renderComparador();
    renderSugerenciaInteligente();
  });

  $('#btn-cart-toggle').addEventListener('click', () => {
    $('#sidebar').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ================= INICIO ================= */
document.addEventListener('DOMContentLoaded', async () => {
  configurarEventos();

  const aviso = $('#data-notice');
  try {
    const data = await cargarPrecios();
    renderCatalogo();
    renderCarrito();
    renderComparador();
    renderSugerenciaInteligente();
    if (aviso) {
      aviso.textContent = `✅ ${data.totalProductos} productos con precios reales extraídos del sitio oficial de Tata (actualizado: ${new Date(data.generatedAt).toLocaleString('es-UY')}). Tienda Inglesa y Kinko no publican precios accesibles: el sitio de TI bloquea el acceso automatizado (Cloudflare) y Kinko no tiene tienda online.`;
    }
  } catch (err) {
    if (aviso) {
      aviso.textContent = '⚠️ Error al cargar data/prices.json. Si abriste el archivo directamente (file://), usá un servidor local: python3 -m http.server 8080';
    }
    console.error(err);
  }
});
