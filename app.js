(() => {
  const body = document.body;

  // Para rendimiento: actualizamos en rAF
  let rafId = null;
  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function paint(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Normalizaciones 0..1
    const nx = clamp(x / w, 0, 1);
    const ny = clamp(y / h, 0, 1);

    // Ángulo del gradiente (apunta hacia el cursor)
    const angle = Math.atan2(y - h / 2, x - w / 2) * (180 / Math.PI);

    // HUE: azules/grises (≈220–230)
    const baseHue = 225 + (nx - 0.5) * 6;      // sutil variación
    const hue1 = baseHue - 6;                  // extremo 1
    const hue2 = baseHue + 4;                  // extremo 2

    // SATURACIÓN: baja a media para look “slate”
    const satCenterBoost = (1 - Math.abs(nx - 0.5) * 2); // más saturado al centro
    const s1 = 8 + satCenterBoost * 22;   // 8%–30%
    const s2 = 10 + satCenterBoost * 18;  // 10%–28%

    // LUMINOSIDAD: más claro arriba, más oscuro abajo
    const lBright = 85 - ny * 25; // 85%→60%
    const lDark   = 12 + ny * 18; // 12%→30%

    // Construimos el gradiente
    const c1 = `hsl(${hue1.toFixed(1)} ${s1.toFixed(1)}% ${lDark.toFixed(1)}%)`;   // oscuro
    const c2 = `hsl(${hue2.toFixed(1)} ${s2.toFixed(1)}% ${lBright.toFixed(1)}%)`; // claro

    body.style.background = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
    body.style.backgroundAttachment = 'fixed'; // efecto “anclado”
  }

  function schedule(x, y) {
    lastX = x; lastY = y;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      paint(lastX, lastY);
    });
  }

  // Eventos
  document.addEventListener('mousemove', (e) => schedule(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) schedule(t.clientX, t.clientY);
  }, { passive: true });

  // Primer render centrado
  paint(lastX, lastY);

  // Recalcular al redimensionar
  window.addEventListener('resize', () => paint(lastX, lastY));
})();
// ======================= app.js (corregido) =======================
// Lógica del "Hacer pedido" para playeras + actividades DOM y botón WhatsApp.
// Lee el formulario, calcula total (modelo * cantidad + extras + envío)
// y muestra un resumen. Incluye pequeños extras de UX con Bootstrap.

/** Utilidad: formatea a moneda MXN */
function toMXN(num) {
  return Number(num || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/** Utilidad: toma precio desde data-precio (en selects/checks) */
function getPrecioFromDataset(el) {
  const raw = el?.dataset?.precio;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

document.addEventListener('DOMContentLoaded', () => {
  // ===================== Pedido: resumen y cálculo =====================
  const form = document.getElementById('formPedido');
  const outNombre = document.getElementById('outNombre');
  const outLista  = document.getElementById('outLista');
  const outTotal  = document.getElementById('outTotal');
  const btnConfirmar = document.getElementById('btnConfirmar');
  const confirmNombre = document.getElementById('confirmNombre');

  // Toast UX (aviso corto)
  const toastBtn = document.getElementById('btnToast');
  const toastEl  = document.getElementById('toastAviso');
  let toast = null;
  if (toastEl && window.bootstrap?.Toast) {
    toast = bootstrap.Toast.getOrCreateInstance(toastEl);
  }
  if (toastBtn && toast) {
    toastBtn.addEventListener('click', () => toast.show());
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault(); // Evita recargar la página

      // 1) Leemos campos base
      const nombre    = document.getElementById('nombreCliente')?.value.trim();
      const selModelo = document.getElementById('selModelo');
      const selTalla  = document.getElementById('selTalla');
      const selColor  = document.getElementById('selColor');
      const cantidad  = Number(document.getElementById('inpCantidad')?.value || 0);

      // Validación mínima:
      if (!nombre || !selModelo?.value || !selTalla?.value || !selColor?.value || cantidad < 1) {
        alert('Completa nombre, modelo, talla, color y cantidad (mínimo 1).');
        return;
      }

      // 2) Precios base
      const optModelo = selModelo.options[selModelo.selectedIndex];
      const precioModelo = getPrecioFromDataset(optModelo); // precio unitario del modelo
      let total = precioModelo * cantidad;

      // 3) Extras / personalización
      const chkNombreNumero = document.getElementById('chkNombreNumero');
      const chkParcheLiga   = document.getElementById('chkParcheLiga');

      const extrasSeleccionados = [];
      if (chkNombreNumero?.checked) {
        total += getPrecioFromDataset(chkNombreNumero) * cantidad; // costo por prenda
        extrasSeleccionados.push('Nombre y número');
      }
      if (chkParcheLiga?.checked) {
        total += getPrecioFromDataset(chkParcheLiga) * cantidad; // costo por prenda
        extrasSeleccionados.push('Parche de liga');
      }

      // Campos condicionales (solo se muestran en resumen si tienen contenido)
      const inpNombre = document.getElementById('inpNombre')?.value.trim();
      const inpNumero = document.getElementById('inpNumero')?.value.trim();

      // 4) Envío e instrucciones
      const selEnvio = document.getElementById('selEnvio');
      const optEnvio = selEnvio?.options[selEnvio.selectedIndex];
      const costoEnvio = getPrecioFromDataset(optEnvio);
      total += costoEnvio;

      const txtInstr = document.getElementById('txtInstrucciones')?.value.trim();

      // 5) Pintamos resumen
      if (outNombre) outNombre.textContent = nombre;

      // Partes condicionales del resumen
      const liPersonalizacion = (inpNombre || inpNumero)
        ? `<li><strong>Personalización:</strong> ${inpNombre ? 'Nombre: ' + inpNombre : ''}${(inpNombre && inpNumero) ? ' | ' : ''}${inpNumero ? 'Número: ' + inpNumero : ''}</li>`
        : '';

      const liInstrucciones = txtInstr
        ? `<li><strong>Instrucciones:</strong> ${txtInstr}</li>`
        : '';

      if (outLista) {
        outLista.innerHTML = `
          <li><strong>Modelo:</strong> ${selModelo.value} — ${toMXN(precioModelo)} c/u × ${cantidad}</li>
          <li><strong>Talla:</strong> ${selTalla.value}</li>
          <li><strong>Color:</strong> ${selColor.value}</li>
          <li><strong>Extras:</strong> ${extrasSeleccionados.length ? extrasSeleccionados.join(', ') : 'Ninguno'}</li>
          ${liPersonalizacion}
          <li><strong>Envío:</strong> ${selEnvio?.value || 'N/A'} — ${toMXN(costoEnvio)}</li>
          ${liInstrucciones}
        `;
      }

      if (outTotal) outTotal.textContent = toMXN(total);

      // Habilitamos confirmar y pasamos nombre al modal
      if (btnConfirmar) btnConfirmar.disabled = false;
      if (confirmNombre) confirmNombre.textContent = nombre;
    });

    // Reset: limpiar también el resumen
    form.addEventListener('reset', () => {
      setTimeout(() => {
        if (outNombre) outNombre.textContent = '—';
        if (outLista) outLista.innerHTML = '<li class="text-muted">Aún no has generado tu pedido.</li>';
        if (outTotal) outTotal.textContent = '$0';
        if (btnConfirmar) btnConfirmar.disabled = true;
      }, 0);
    });
  }

  // ================== Actividades DOM (Banner, Testimonios, Contacto) ==================
  // -------- Actividad 1: Banner con getElementById --------
  const banner = document.getElementById('banner');
  const btnPromo = document.getElementById('btnPromo');

  btnPromo?.addEventListener('click', () => {
    if (!banner) return;
    // Limpio posibles fondos previos del banner
    banner.classList.remove('bg-dark', 'bg-primary', 'bg-success', 'bg-info', 'bg-danger', 'bg-warning');
    // Aplico un nuevo color de fondo (warning = amarillo)
    banner.classList.add('bg-warning');
    // Ajusto contraste del texto
    banner.classList.remove('text-white');
    banner.classList.add('text-dark');
  });

  // -------- Actividad 2: Testimonios --------
  // 2.1 VIP en azul (text-primary) usando getElementsByClassName
  const vipItems = document.getElementsByClassName('testimonio-vip');
  for (const item of vipItems) {
    item.classList.add('text-primary'); // color azul Bootstrap
  }

  // 2.2 TODOS los párrafos en rojo (text-danger) usando getElementsByTagName
  // (Si solo quieres afectar la sección de testimonios, usa querySelectorAll('#testimonios p'))
  const allParagraphs = document.getElementsByTagName('p');
  for (const p of allParagraphs) {
    p.classList.add('text-danger');
  }

  // -------- Actividad 3: Formulario de contacto --------
  // 3.1 Primer input de texto con querySelector (le pongo bg-success para resaltarlo)
  const firstTextInput = document.querySelector('#formContacto input[type="text"]');
  firstTextInput?.classList.add('bg-success', 'bg-opacity-10'); // fondo verdoso suave

  // 3.2 Todos los botones del formulario a btn-danger con querySelectorAll
  const contactoButtons = document.querySelectorAll('#formContacto button');
  contactoButtons.forEach(btn => {
    btn.classList.remove('btn-primary', 'btn-outline-secondary');
    btn.classList.add('btn-danger');
  });

  // 3.3 Campo "nombre" via getElementsByName -> color de texto text-warning
  const nombreInputs = document.getElementsByName('nombre');
  if (nombreInputs.length > 0) {
    const nombreInput = nombreInputs[0];
    nombreInput.classList.add('text-warning'); // texto del input en amarillo
    // Opcional: también pinto el <label> asociado
    const label = document.querySelector('label[for="cNombre"]');
    label?.classList.add('text-warning');
  }

  // ======= WhatsApp flotante: mostrar tras scroll + mensaje por horario =======
  const waBtn = document.querySelector('.whatsapp-float');
  if (waBtn) {
    // 1) Mensaje dinámico según hora local (9 a 18 h "en línea")
    const h = new Date().getHours();
    const enHorario = h >= 9 && h < 18;
    const msg = enHorario ? '¡Respondo ahora!' : 'Fuera de horario, te contesto pronto';
    waBtn.title = `WhatsApp — ${msg}`;
    waBtn.setAttribute('aria-label', `Chatea por WhatsApp — ${msg}`);

    // (Opcional) Prefill del texto en el chat
    const telefono = '527221234567'; // 52 + 10 dígitos (México)
    const texto = encodeURIComponent('Hola, vengo del sitio de Profe Joako. Me interesa una playera.');
    waBtn.href = `https://wa.me/${telefono}?text=${texto}`;

    // 2) Mostrar/ocultar por scroll (aparece al bajar 300px)
    const UMBRAL = 300;
    const toggleWA = () => {
      if (window.scrollY > UMBRAL) {
        waBtn.classList.add('show');
      } else {
        waBtn.classList.remove('show');
      }
    };

    // Estado inicial y listener
    toggleWA();
    window.addEventListener('scroll', toggleWA, { passive: true });
  }
});
// ===================== /app.js =======================





