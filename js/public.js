// ────────────────────────────────────────────
// LOUSBITE — App del lado del cliente
// Carga datos desde archivos JSON locales
// ────────────────────────────────────────────

// === UTILIDADES ===
async function cargarJSON(url) {
  // Cache-buster: agrega timestamp para evitar caché del navegador
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}_t=${Date.now()}`);
  if (!res.ok) throw new Error(`Error al cargar ${url}`);
  return res.json();
}

// === TIMELINE (página principal) ===
document.addEventListener('DOMContentLoaded', async () => {
  const timeline = document.getElementById('timeline');
  if (timeline) {
    try {
      const data = await cargarJSON('data/posts.json');
      const posts = data.lista || [];

      if (posts.length === 0) {
        timeline.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--texto-claro);">Todavía no hay posts. ¡Volvé pronto!</p>';
      } else {
        // Mostrar solo posts con fecha actual o pasada, ordenados del más reciente primero
        const hoyStr = new Date().toLocaleDateString('en-CA'); // "2026-07-17"
        const postsVisibles = posts
          .filter(p => p.fecha_publicacion <= hoyStr)
          .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));

        timeline.innerHTML = postsVisibles.map(post => `
          <div class="post">
            <div class="post-imagen-wrap">
              ${post.imagen_url
                ? `<img src="${post.imagen_url}" alt="Post de Lousbite">`
                : `<div style="height:260px;display:flex;align-items:center;justify-content:center;color:var(--texto-claro);font-size:2rem;">🍪</div>`
              }
            </div>
            <div class="post-content">
              <p class="fecha">${new Date(post.fecha_publicacion + 'T12:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>${post.texto || ''}</p>
              ${post.precio ? `<p class="precio" style="margin-top:0.5rem;">Q${post.precio}</p>` : ''}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      timeline.innerHTML = '<p style="text-align:center;padding:2rem;color:#c62828;">Error al cargar los posts 😢</p>';
      console.error('Error cargando posts:', err);
    }
  }

  // === CATÁLOGO ===
  const catalogo = document.getElementById('catalogo');
  if (catalogo) {
    try {
      const data = await cargarJSON('data/productos.json');
      const productos = data.lista || [];

      if (productos.length === 0) {
        catalogo.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--texto-claro);">Próximamente nuevos productos 🍪</p>';
      } else {
        const disponibles = productos.filter(p => p.disponible !== false);
        catalogo.innerHTML = disponibles.map(p => `
          <div class="card" style="cursor:pointer;" onclick="abrirModalProducto(${p.id})">
            ${p.imagen_url
              ? `<img src="${p.imagen_url}" alt="${p.nombre}">`
              : `<div style="height:200px;background:var(--cafe-claro);display:flex;align-items:center;justify-content:center;font-size:3rem;">🍪</div>`
            }
            <div class="card-body">
              <h3>${p.nombre}</h3>
              <p style="color:var(--texto-claro);margin-bottom:0.5rem;">${p.descripcion || ''}</p>
              <p class="precio">Q${p.precio}</p>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      catalogo.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:#c62828;">Error al cargar productos 😢</p>';
      console.error('Error cargando productos:', err);
    }
  }

  // === CALENDARIO ===
  const calGrid = document.getElementById('cal-mes-grid');
  if (calGrid) {
    await initCalendario();
  }
});

// === MODAL DE PRODUCTO ===
async function abrirModalProducto(id) {
  try {
    const data = await cargarJSON('data/productos.json');
    const productos = data.lista || [];
    const p = productos.find(x => x.id === id);
    if (!p) return;

    document.getElementById('modal-body').innerHTML = `
      ${p.imagen_url
        ? `<img src="${p.imagen_url}" alt="${p.nombre}">`
        : `<div style="height:200px;background:var(--cafe-claro);display:flex;align-items:center;justify-content:center;font-size:4rem;border-radius:12px;margin-bottom:1rem;">🍪</div>`
      }
      <h2 style="color:var(--cafe-oscuro);margin-bottom:0.5rem;">${p.nombre}</h2>
      <p style="color:var(--texto-claro);margin-bottom:1rem;">${p.descripcion || 'Sin descripción'}</p>
      <p style="font-size:1.5rem;font-weight:bold;color:var(--rosa-oscuro);">Q${p.precio}</p>
    `;
    document.getElementById('producto-modal').classList.add('active');
  } catch (e) {
    console.error('Error al abrir modal:', e);
  }
}

function cerrarModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('producto-modal').classList.remove('active');
}

// === CALENDARIO MENSUAL ===
let calendarioDias = [];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

async function initCalendario() {
  try {
    const data = await cargarJSON('data/calendario.json');
    calendarioDias = data.lista || [];
  } catch (e) {
    calendarioDias = [];
    console.error('Error cargando calendario:', e);
  }
  renderizarMes();
}

function cambiarMes(delta) {
  mesActual += delta;
  if (mesActual > 11) { mesActual = 0; anioActual++; }
  if (mesActual < 0) { mesActual = 11; anioActual--; }
  renderizarMes();
}

function renderizarMes() {
  const grid = document.getElementById('cal-mes-grid');
  const titulo = document.getElementById('cal-mes-titulo');
  if (!grid || !titulo) return;

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  titulo.textContent = `${meses[mesActual]} ${anioActual}`;

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const primerDia = new Date(anioActual, mesActual, 1);
  const ultimoDia = new Date(anioActual, mesActual + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const diaInicio = primerDia.getDay();

  const ultimoMes = new Date(anioActual, mesActual, 0);
  const diasMesAnterior = ultimoMes.getDate();

  const celdas = [];

  // Encabezados
  diasSemana.forEach(d => {
    celdas.push(`<div class="cal-mes-dia-nombre">${d}</div>`);
  });

  // Días del mes anterior (grises)
  for (let i = diaInicio - 1; i >= 0; i--) {
    celdas.push(`<div class="cal-mes-dia vacio otro-mes">${diasMesAnterior - i}</div>`);
  }

  // Días del mes actual
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const entrada = calendarioDias.find(d => {
      const dStr = d.fecha.substring(0, 10);
      return dStr === fechaStr;
    });

    let clase = 'cal-mes-dia';
    let badge = '';
    if (entrada) {
      if (entrada.tipo === 'venta') { clase += ' dia-venta'; badge = '<div class="badge">💚 Venta</div>'; }
      else if (entrada.tipo === 'especial') { clase += ' dia-especial'; badge = '<div class="badge">💛 Especial</div>'; }
      else if (entrada.tipo === 'feriado') { clase += ' dia-feriado'; badge = '<div class="badge">❤️ Sin venta</div>'; }
    } else {
      clase += ' dia-vacio';
    }

    const hoy = new Date();
    const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear();
    if (esHoy) clase += ' hoy';

    celdas.push(`<div class="${clase}" title="${entrada && entrada.descripcion ? entrada.descripcion : fechaStr}">
      ${dia}${badge}
    </div>`);
  }

  // Días del mes siguiente
  const totalCeldas = diaInicio + diasEnMes;
  const celdasRestantes = 7 - (totalCeldas % 7);
  if (celdasRestantes < 7) {
    for (let i = 1; i <= celdasRestantes; i++) {
      celdas.push(`<div class="cal-mes-dia vacio otro-mes">${i}</div>`);
    }
  }

  grid.innerHTML = celdas.join('');
}
