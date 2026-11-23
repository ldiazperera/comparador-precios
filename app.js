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
  { id: 'tienda-inglesa', nombre: 'Tienda Inglesa', color: 'var(--sm-tienda-inglesa)', conDatos: true },
  { id: 'fresh-market',   nombre: 'Fresh Market',   color: 'var(--sm-fresh-market)',   conDatos: true },
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

function obtenerSupermercado(id) {
  return SUPERMERCADOS.find((sm) => sm.id === id);
}

/* Ofertas del producto como lista [{ smId, precio, ... }] */
function listarOfertas(producto) {
  return Object.entries(producto.ofertas).map(([smId, oferta]) => ({ smId, ...oferta }));
}

/* Oferta más barata del producto (o null si no tiene ninguna) */
function obtenerMejorOferta(producto) {
  const ofertas = listarOfertas(producto);
  if (ofertas.length === 0) return null;
  return ofertas.reduce((mejor, actual) => (actual.precio < mejor.precio ? actual : mejor));
}

/* ================= CARGA DE DATOS ================= */
async function cargarPrecios() {
  const res = await fetch('data/prices.json');
  if (!res.ok) throw new Error('No se pudo cargar data/prices.json');
  const data = await res.json();

  // Productos de Tata: una sola oferta (Tata).
  const productosTata = (data.productos || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    unidad: p.unidad,
    categoria: p.categoria,
    ofertas: { tata: { producto: p.nombre, precio: p.precio, unidad: p.unidad, link: p.link } },
  }));

  // Canasta básica: precios cargados a mano en varios supermercados.
  let productosCanasta = [];
  let canasta = null;
  try {
    const resCanasta = await fetch('data/canasta.json');
    if (resCanasta.ok) {
      canasta = await resCanasta.json();
      productosCanasta = canasta.items.map((item) => ({
        id: `canasta-${item.id}`,
        nombre: item.nombre,
        unidad: item.unidad,
        categoria: item.categoria,
        esCanasta: true,
        ofertas: item.ofertas,
      }));
    }
  } catch (err) {
    console.warn('No se pudo cargar data/canasta.json', err);
  }

  PRODUCTOS = [...productosCanasta, ...productosTata];
  return { ...data, canasta };
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
    const ofertas = listarOfertas(producto);
    const mejor = obtenerMejorOferta(producto);
    const filasPrecios = ofertas.map((oferta) => {
      const sm = obtenerSupermercado(oferta.smId);
      const esMejor = ofertas.length > 1 && mejor && oferta.smId === mejor.smId;
      const detalle = oferta.producto ? ` title="${oferta.producto}"` : '';
      return `
          <div class="price-row${esMejor ? ' best' : ''}"${detalle}>
            <span class="sm-name">${sm ? sm.nombre : oferta.smId}</span>
            <span class="price">${formatearPrecio(oferta.precio)}</span>
          </div>`;
    }).join('');
    return `
      <article class="product-card" data-id="${producto.id}">
        <div class="product-emoji">${emoji}</div>
        <div>
          <div class="product-name">${producto.nombre}</div>
          <div class="product-unit">${producto.unidad}</div>
        </div>
        <div class="product-prices">${filasPrecios}
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
    const mejor = obtenerMejorOferta(producto);
    if (!mejor) return;
    const smMejor = obtenerSupermercado(mejor.smId);
    totalItems += cantidad;
    totalGeneral += mejor.precio * cantidad;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${producto.nombre}</div>
        <div class="cart-item-price">${producto.unidad} · ${formatearPrecio(mejor.precio)} c/u · mejor precio en ${smMejor ? smMejor.nombre : mejor.smId}</div>
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
    totalEl.textContent = `Total (mejor precio): ${formatearPrecio(totalGeneral)}`;
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

  const resumen = calcularTotalesPorSupermercado();
  const completos = resumen.filter((r) => r.completo);
  const maxTotal = Math.max(...completos.map((r) => r.total), 1);
  const ganador = completos.length > 0
    ? completos.reduce((mejor, actual) => (actual.total < mejor.total ? actual : mejor))
    : null;

  contenedor.innerHTML = resumen.map((r) => {
    const { sm } = r;
    const cabecera = `
          <span class="compare-sm">
            <span class="sm-dot" style="background:${sm.color}"></span>
            ${sm.nombre}
          </span>`;
    if (!r.completo) {
      const motivo = sm.conDatos
        ? `faltan ${r.faltantes} de ${r.cantidadProductos} productos`
        : 'sin datos públicos';
      return `
        <div class="compare-row nodata">${cabecera}
          <div class="compare-bar-track">
            <span class="nodata-label">${motivo}</span>
          </div>
          <span class="compare-total">—</span>
        </div>`;
    }
    const esGanador = ganador && r.sm.id === ganador.sm.id;
    const ancho = Math.round((r.total / maxTotal) * 100);
    return `
        <div class="compare-row${esGanador ? ' winner' : ''}">${cabecera}
          <div class="compare-bar-track">
            <div class="compare-bar" style="width:${ancho}%;background:${sm.color}"></div>
          </div>
          <span class="compare-total">${formatearPrecio(r.total)}</span>
        </div>`;
  }).join('');

  if (ganador) {
    mejorOpcion.hidden = false;
    mejorOpcionValor.textContent = `${ganador.sm.nombre} — ${formatearPrecio(ganador.total)}`;
  } else {
    mejorOpcion.hidden = true;
  }
}

/* Total del carrito por supermercado. Solo es comparable si el supermercado
   tiene precio para TODOS los productos del carrito. */
function calcularTotalesPorSupermercado() {
  const productosCarrito = Object.keys(carrito)
    .map((id) => ({ producto: obtenerProducto(id), cantidad: carrito[id] }))
    .filter((item) => item.producto);

  return SUPERMERCADOS.map((sm) => {
    let total = 0;
    let faltantes = 0;
    productosCarrito.forEach(({ producto, cantidad }) => {
      const oferta = producto.ofertas[sm.id];
      if (oferta) total += oferta.precio * cantidad;
      else faltantes += 1;
    });
    return {
      sm,
      total,
      faltantes,
      cantidadProductos: productosCarrito.length,
      completo: sm.conDatos && productosCarrito.length > 0 && faltantes === 0,
    };
  });
}

/* ================= SUGERENCIA INTELIGENTE ================= */
function renderSugerenciaInteligente() {
  const contenedor = $('#smart-suggestion');

  if (Object.keys(carrito).length === 0) {
    contenedor.innerHTML = '<p class="empty-state">Agregá productos para ver la sugerencia.</p>';
    return;
  }

  // Para cada producto se elige el supermercado más barato y se agrupa por tienda.
  const porSupermercado = {};
  let totalDividido = 0;
  Object.keys(carrito).forEach((id) => {
    const producto = obtenerProducto(id);
    const mejor = producto && obtenerMejorOferta(producto);
    if (!mejor) return;
    const cantidad = carrito[id];
    const subtotal = mejor.precio * cantidad;
    if (!porSupermercado[mejor.smId]) porSupermercado[mejor.smId] = { items: 0, total: 0 };
    porSupermercado[mejor.smId].items += cantidad;
    porSupermercado[mejor.smId].total += subtotal;
    totalDividido += subtotal;
  });

  const filas = Object.entries(porSupermercado).map(([smId, datos]) => {
    const sm = obtenerSupermercado(smId);
    return `
      <div class="split-item">
        <span class="sm-dot" style="background:${sm ? sm.color : '#999'}"></span>
        ${sm ? sm.nombre : smId} · ${datos.items} ${datos.items === 1 ? 'producto' : 'productos'}
        <span class="split-amount">${formatearPrecio(datos.total)}</span>
      </div>`;
  }).join('');

  // Ahorro frente a la mejor tienda que cubre todo el carrito (si existe).
  const completos = calcularTotalesPorSupermercado().filter((r) => r.completo);
  let mensaje;
  if (completos.length === 0) {
    mensaje = `Total repartiendo la compra: <strong>${formatearPrecio(totalDividido)}</strong>.
      Ningún supermercado tiene precio para todos los productos de tu carrito.`;
  } else {
    const mejorTienda = completos.reduce((mejor, actual) => (actual.total < mejor.total ? actual : mejor));
    const ahorro = mejorTienda.total - totalDividido;
    mensaje = ahorro > 0
      ? `Repartiendo la compra pagás <strong>${formatearPrecio(totalDividido)}</strong> y ahorrás
         <strong>${formatearPrecio(ahorro)}</strong> frente a comprar todo en ${mejorTienda.sm.nombre}.`
      : `Comprar todo en <strong>${mejorTienda.sm.nombre}</strong> (${formatearPrecio(mejorTienda.total)})
         ya es la opción más barata: repartir no ahorra nada.`;
  }

  contenedor.innerHTML = `${filas}<div class="split-savings">${mensaje}</div>`;
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
      const cantidadCanasta = data.canasta ? data.canasta.items.length : 0;
      aviso.textContent = `✅ ${data.totalProductos} productos de Tata (API oficial, actualizado: ${new Date(data.generatedAt).toLocaleString('es-UY')}). ` +
        `Canasta básica de ${cantidadCanasta} productos cargada manualmente en Tienda Inglesa y Fresh Market (relevada: ${data.canasta ? data.canasta.generatedAt : '—'}). ` +
        'Kinko no tiene tienda online.';
    }
  } catch (err) {
    if (aviso) {
      aviso.textContent = '⚠️ Error al cargar data/prices.json. Si abriste el archivo directamente (file://), usá un servidor local: python3 -m http.server 8080';
    }
    console.error(err);
  }
});
