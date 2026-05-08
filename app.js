/* ===================================================
   Agenda Reunión Sacramental — Estaca Cuernavaca
   app.js — Lógica + tiempos + caché + exportar .docx
   =================================================== */

const T_TOTAL    = 70;
const T_APERTURA = 10;
const T_CENA     = 15;
const T_CIERRE   =  5;
const T_PROG_MAX = T_TOTAL - T_APERTURA - T_CENA - T_CIERRE; // 40

const HORA_INICIO_H = 10;
const HORA_INICIO_M = 0;

const CACHE_KEY   = 'agenda_estaca_cuernavaca_v1';
let tiempoFinalMin = 0;
let autoSaveTimer  = null;

/* ════════════════════════════════════════════════════
   INICIALIZACIÓN
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const restored = cargarDesdeCache();
  if (!restored) {
    document.getElementById('fecha').valueAsDate = new Date();
  }

  document.getElementById('chkEstaca').addEventListener('change', function () {
    document.getElementById('estaca-block').classList.toggle('hidden', !this.checked);
    programarAutoGuardado();
  });

  document.querySelectorAll('.add-btn[data-list]').forEach(btn => {
    btn.addEventListener('click', () => {
      addSimpleItem(btn.dataset.list, btn.dataset.placeholder);
      programarAutoGuardado();
    });
  });

  document.getElementById('add-prog-btn').addEventListener('click', () => {
    addProgItem();
    programarAutoGuardado();
  });

  document.querySelectorAll('.tiempo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tiempo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tiempoFinalMin = parseInt(btn.dataset.min);
      document.getElementById('tiempo-selected').textContent =
        '⏱ ' + tiempoFinalMin + ' min para el mensaje de cierre';
      calcTotal();
      programarAutoGuardado();
    });
  });

  // Auto-guardar en cualquier cambio de input
  document.addEventListener('input',  programarAutoGuardado);
  document.addEventListener('change', programarAutoGuardado);

  document.getElementById('btn-print').addEventListener('click', imprimirUnaPage);
  document.getElementById('btn-docx').addEventListener('click',  exportarDocx);
  document.getElementById('btn-save').addEventListener('click',  () => guardarEnCache(true));
  document.getElementById('btn-blank').addEventListener('click', limpiarAgenda);

document.getElementById('btn-save-named').addEventListener('click', guardarComoAgenda);
  document.getElementById('btn-open-saved').addEventListener('click', abrirPanelGuardadas);
  document.getElementById('btn-close-saved').addEventListener('click', cerrarPanelGuardadas);
  document.getElementById('saved-panel').addEventListener('click', e => {
    if (e.target === document.getElementById('saved-panel')) cerrarPanelGuardadas();
  });

  actualizarBadgeGuardadas();
  calcTotal();
});

/* ════════════════════════════════════════════════════
   CACHÉ — localStorage
   ════════════════════════════════════════════════════ */

function recopilarEstado() {
  const campos = {};
  document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]')
    .forEach(el => { if (el.id) campos[el.id] = el.value; });

  const checks = {};
  ['chkEstaca', 'chkRelevos', 'chkSost'].forEach(id => {
    checks[id] = document.getElementById(id).checked;
  });

  const listas = {};
  ['anuncios-list', 'relevos-list', 'sost-list'].forEach(listId => {
    listas[listId] = Array.from(
      document.querySelectorAll('#' + listId + ' input[type="text"]')
    ).map(i => i.value);
  });

  const programa = Array.from(document.querySelectorAll('#prog-list .prog-item')).map(item => {
    const inputs  = item.querySelectorAll('input');
    const selects = item.querySelectorAll('select');
    return {
      nombre: inputs[0]?.value  || '',
      tipo:   selects[0]?.value || 'Discurso',
      min:    selects[1]?.value || '10',
    };
  });

  return { version: 1, timestamp: new Date().toISOString(), campos, checks, listas, programa, tiempoFinalMin };
}

function guardarEnCache(manual = false) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(recopilarEstado()));
    mostrarEstadoCache(
      manual
        ? '✅ Borrador guardado — ' + horaActual()
        : '💾 Guardado automáticamente — ' + horaActual(),
      manual ? 4000 : 2500
    );
  } catch (e) {
    mostrarEstadoCache('⚠️ No se pudo guardar: ' + e.message, 4000);
  }
}

function cargarDesdeCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const estado = JSON.parse(raw);
    if (!estado || estado.version !== 1) return false;

    Object.entries(estado.campos || {}).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    Object.entries(estado.checks || {}).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = val;
        if (id === 'chkEstaca')
          document.getElementById('estaca-block').classList.toggle('hidden', !val);
      }
    });

    Object.entries(estado.listas || {}).forEach(([listId, valores]) => {
      const btn = document.querySelector('.add-btn[data-list="' + listId + '"]');
      const ph  = btn ? btn.dataset.placeholder : 'Ítem';
      valores.forEach(val => {
        addSimpleItem(listId, ph);
        const items = document.querySelectorAll('#' + listId + ' input[type="text"]');
        if (items.length) items[items.length - 1].value = val;
      });
    });

    (estado.programa || []).forEach(p => {
      addProgItem();
      const items = document.querySelectorAll('#prog-list .prog-item');
      const last  = items[items.length - 1];
      if (!last) return;
      const inputs  = last.querySelectorAll('input');
      const selects = last.querySelectorAll('select');
      if (inputs[0])  inputs[0].value  = p.nombre;
      if (selects[0]) selects[0].value = p.tipo;
      if (selects[1]) selects[1].value = p.min;
    });

    tiempoFinalMin = estado.tiempoFinalMin || 0;
    if (tiempoFinalMin > 0) {
      const btn = document.querySelector('.tiempo-btn[data-min="' + tiempoFinalMin + '"]');
      if (btn) btn.classList.add('active');
      document.getElementById('tiempo-selected').textContent =
        '⏱ ' + tiempoFinalMin + ' min para el mensaje de cierre';
    }

    calcTotal();
    const ts = estado.timestamp ? new Date(estado.timestamp).toLocaleString('es-MX') : '';
    mostrarEstadoCache('📂 Borrador restaurado del ' + ts, 5000);
    return true;
  } catch (e) {
    console.warn('Error al cargar caché:', e);
    return false;
  }
}

function programarAutoGuardado() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => guardarEnCache(false), 1500);
}

function mostrarEstadoCache(msg, duracion = 3000) {
  const el = document.getElementById('cache-status');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), duracion);
}

function horaActual() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/* ════════════════════════════════════════════════════
   EXPORTAR .DOCX
   ════════════════════════════════════════════════════ */
async function exportarDocx() {
  if (typeof docx === 'undefined') {
    alert('La librería docx.js no está disponible.\nVerifica tu conexión a internet.');
    return;
  }

  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType,
  } = docx;

  const W = 9792; // ancho en DXA (Letter con márgenes 0.7")

  // ── Helpers ──────────────────────────────────────
  const lineBorder  = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  const allBorders  = { top: lineBorder, bottom: lineBorder, left: lineBorder, right: lineBorder };
  const getVal      = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  const heading = (text, lvl = 1) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: lvl === 1 ? 24 : 21, font: 'Arial',
      color: lvl === 1 ? '1a5fa5' : '444444' })],
    spacing: { before: lvl === 1 ? 180 : 120, after: 60 },
    border: lvl === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0E4F7' } } : undefined,
  });

  const campo = (label, value) => new Paragraph({
    children: [
      new TextRun({ text: label + ': ', bold: true, size: 19, font: 'Arial' }),
      new TextRun({ text: value || '—', size: 19, font: 'Arial' }),
    ],
    spacing: { before: 30, after: 30 },
  });

  const italico = text => new Paragraph({
    children: [new TextRun({ text: text || '', italics: true, size: 17, font: 'Arial', color: '666666' })],
    spacing: { before: 60, after: 60 },
    shading: { fill: 'F7F6F3', type: ShadingType.CLEAR },
    indent: { left: 360, right: 360 },
  });

  const separador = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'EEEEEE' } },
    spacing: { before: 80, after: 80 },
    children: [],
  });

  const listaParagraphs = listId => {
    const vals = Array.from(document.querySelectorAll('#' + listId + ' input[type="text"]'))
      .map(i => i.value.trim()).filter(Boolean);
    if (!vals.length) return [campo('(ninguno)', '')];
    return vals.map(v => new Paragraph({
      children: [new TextRun({ text: '• ' + v, size: 19, font: 'Arial' })],
      spacing: { before: 30, after: 30 },
      indent: { left: 360 },
    }));
  };

  // ── Tabla del programa ────────────────────────────
  const colWidths = [3900, 1800, 900, 900, 900];
  const colSum    = colWidths.reduce((a, b) => a + b, 0);

  const thCell = (text, w) => new TableCell({
    borders: allBorders,
    shading: { fill: 'E6F1FB', type: ShadingType.CLEAR },
    width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: 'Arial' })] })],
  });

  const tdCell = (text, w) => new TableCell({
    borders: allBorders,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: text || '—', size: 18, font: 'Arial' })] })],
  });

  const progItems = Array.from(document.querySelectorAll('#prog-list .prog-item')).map(item => ({
    nombre: item.querySelectorAll('input')[0]?.value   || '',
    tipo:   item.querySelectorAll('select')[0]?.value  || '',
    min:    item.querySelectorAll('select')[1]?.value  || '',
    inicio: item.querySelector('.inicio-cell')?.textContent || '',
    fin:    item.querySelector('.fin-cell')?.textContent    || '',
  }));

  const tablaPrograma = new Table({
    width: { size: colSum, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: [
        thCell('Nombre / Tema', colWidths[0]),
        thCell('Tipo',          colWidths[1]),
        thCell('Min',           colWidths[2]),
        thCell('Inicio',        colWidths[3]),
        thCell('Fin',           colWidths[4]),
      ]}),
      ...progItems.map(p => new TableRow({ children: [
        tdCell(p.nombre,       colWidths[0]),
        tdCell(p.tipo,         colWidths[1]),
        tdCell(p.min + ' min', colWidths[2]),
        tdCell(p.inicio,       colWidths[3]),
        tdCell(p.fin,          colWidths[4]),
      ]})),
    ],
  });

  // ── Campos de las secciones estáticas ────────────
  // Sección 1 — Preludio
  const secPreludInputs = document.querySelectorAll(
    '.section:nth-of-type(1) .section-body input[type="text"]');
  const labels1 = ['Preside', 'Dirige', 'Reconocemos entre nosotros a'];

  // Sección 3 — Apertura
  const secApertInputs = document.querySelectorAll(
    '.section:nth-of-type(3) .section-body input[type="text"]');
  const labels3 = ['Himno No. y Título', 'Dirige la Música', 'Oración de Apertura', 'Al Piano / Órgano'];

  // Sección 5 — Santa Cena
  const secCenaInputs = document.querySelectorAll(
    '.section:nth-of-type(5) .section-body input[type="text"]');
  const labels5 = ['Himno Sacramental', 'Bendice', 'Reparte'];

  // Sección 7 — Cierre (inputs excepto hermano-cierre que ya se obtiene por id)
  const secCierreInputs = Array.from(
    document.querySelectorAll('.section:nth-of-type(7) .section-body input[type="text"]')
  ).filter(el => el.id !== 'hermano-cierre');
  const labels7 = ['Último Himno No. y Título', 'Dirige la Música', 'La Última Oración ofrecida por'];

  // ── Fecha legible ─────────────────────────────────
  const fechaVal = getVal('fecha');
  let fechaFmt   = fechaVal;
  try {
    fechaFmt = new Date(fechaVal + 'T12:00:00').toLocaleDateString('es-MX',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    fechaFmt = fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1);
  } catch (_) {}

  // ── Construir secciones del documento ────────────
  const children = [
    // Encabezado
    new Paragraph({
      children: [new TextRun({ text: 'La Iglesia de Jesucristo de los Santos de los Últimos Días',
        size: 17, font: 'Arial', color: '888780', allCaps: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Agenda de Reunión Sacramental — Estaca Cuernavaca',
        bold: true, size: 28, font: 'Arial', color: '1a1a18' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Barrio: ',       bold: true,  size: 19, font: 'Arial' }),
        new TextRun({ text: getVal('barrio') || '—',       size: 19, font: 'Arial' }),
        new TextRun({ text: '     Fecha: ',   bold: true,  size: 19, font: 'Arial' }),
        new TextRun({ text: fechaFmt || '—',               size: 19, font: 'Arial' }),
        new TextRun({ text: '     Asistencia: ', bold: true, size: 19, font: 'Arial' }),
        new TextRun({ text: getVal('asistencia') || '—',   size: 19, font: 'Arial' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    separador(),

    // 1. Preludio
    heading('1. Preludio y Apertura'),
    ...Array.from(secPreludInputs).map((el, i) => campo(labels1[i] || el.placeholder, el.value)),
    italico('El Presidente ___ quien preside esta reunión, me ha solicitado a mí, el hermano ___, que dirija esta reunión.'),
    separador(),

    // 2. Anuncios
    heading('2. Anuncios'),
    ...listaParagraphs('anuncios-list'),
    separador(),

    // 3. Apertura
    heading('3. Himno de Apertura y Oración'),
    ...Array.from(secApertInputs).map((el, i) => campo(labels3[i] || el.placeholder, el.value)),
    separador(),

    // 4. Asuntos
    heading('4. Asuntos de Barrio y Estaca'),
    ...(document.getElementById('chkEstaca').checked
      ? [campo('Asuntos de Estaca — presentados por',
          document.querySelector('#estaca-block input')?.value || '')] : []),
    ...(document.getElementById('chkRelevos').checked
      ? [campo('Relevos', ''), ...listaParagraphs('relevos-list')] : []),
    ...(document.getElementById('chkSost').checked
      ? [campo('Sostenimientos', ''), ...listaParagraphs('sost-list')] : []),
    ...(!document.getElementById('chkEstaca').checked &&
        !document.getElementById('chkRelevos').checked &&
        !document.getElementById('chkSost').checked
      ? [campo('(sin asuntos esta semana)', '')] : []),
    separador(),

    // 5. Santa Cena
    heading('5. Himno Sacramental y Santa Cena'),
    ...Array.from(secCenaInputs).map((el, i) => campo(labels5[i] || el.placeholder, el.value)),
    italico('Queremos expresar nuestro agradecimiento a los Hermanos que nos ayudaron con la administración de la Santa Cena y los invitamos a sentarse con la congregación. Ahora pasaremos al tiempo de los mensajes.'),
    separador(),

    // 6. Programa principal
    heading('6. Programa Principal'),
    ...(progItems.length ? [tablaPrograma, new Paragraph({ children: [], spacing: { after: 60 } })]
                         : [campo('(sin elementos)', '')]),
    separador(),

    // 7. Cierre
    heading('7. Cierre'),
    italico('Queremos expresar nuestro agradecimiento a los Hermanos que nos ayudaron con los mensajes, Música y apertura.'),
    campo('Para finalizar escucharemos al Hermano(a)', getVal('hermano-cierre')),
    ...(tiempoFinalMin ? [campo('Tiempo asignado', tiempoFinalMin + ' min')] : []),
    ...Array.from(secCierreInputs).map((el, i) => campo(labels7[i] || el.placeholder, el.value)),
    italico('Al finalizar esta reunión Sacramental, les invitamos a que nos acompañen a aprender del Evangelio de Jesucristo en nuestras clases de Escuela Dominical.'),
    separador(),

    // Pie de página
    new Paragraph({
      children: [new TextRun({ text: '"Haced todas las cosas con orden y decencia ante Dios." — D&C 20:68',
        italics: true, size: 15, font: 'Arial', color: '888780' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 19 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
        },
      },
      children,
    }],
  });

  // ── Descargar ─────────────────────────────────────
  const btn = document.getElementById('btn-docx');
  try {
    btn.textContent = '⏳ Generando...';
    btn.disabled    = true;

    const blob   = await Packer.toBlob(doc);
    const fecha  = getVal('fecha') || new Date().toISOString().split('T')[0];
    const nombre = 'Agenda_Estaca_Cuernavaca_' + fecha + '.docx';

    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarEstadoCache('✅ Archivo Word descargado: ' + nombre, 5000);
  } catch (err) {
    alert('Error al generar el .docx:\n' + err.message);
    console.error(err);
  } finally {
    btn.textContent = '📝 Exportar .docx';
    btn.disabled    = false;
  }
}

/* ════════════════════════════════════════════════════
   LISTAS DINÁMICAS
   ════════════════════════════════════════════════════ */
function addSimpleItem(listId, placeholder) {
  const list  = document.getElementById(listId);
  const div   = document.createElement('div');
  div.className = 'dyn-item';
  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = placeholder;
  const del = document.createElement('button');
  del.className = 'del-btn'; del.textContent = '×'; del.title = 'Eliminar';
  del.addEventListener('click', () => { div.remove(); programarAutoGuardado(); });
  div.appendChild(input);
  div.appendChild(del);
  list.appendChild(div);
}

function addProgItem() {
  const list = document.getElementById('prog-list');
  const div  = document.createElement('div');
  div.className = 'dyn-item prog-item';

  const inputNombre       = document.createElement('input');
  inputNombre.type        = 'text';
  inputNombre.placeholder = 'Nombre / tema';

  const selectTipo = document.createElement('select');
  ['Discurso','Mensaje','Música especial','Testimonio','Número musical','Otro'].forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = t;
    selectTipo.appendChild(o);
  });

  const selectMin = document.createElement('select');
  [3,5,7,8,10,12,15,20,25].forEach(m => {
    const o = document.createElement('option'); o.value = m; o.textContent = m + ' min';
    if (m === 10) o.selected = true;
    selectMin.appendChild(o);
  });
  selectMin.addEventListener('change', calcTotal);

  const tdInicio = document.createElement('div');
  tdInicio.className = 'time-cell inicio-cell'; tdInicio.textContent = '--:--';
  const tdFin = document.createElement('div');
  tdFin.className = 'time-cell fin-cell'; tdFin.textContent = '--:--';

  const del = document.createElement('button');
  del.className = 'del-btn'; del.textContent = '×'; del.title = 'Eliminar';
  del.addEventListener('click', () => { div.remove(); calcTotal(); programarAutoGuardado(); });

  div.appendChild(inputNombre);
  div.appendChild(selectTipo);
  div.appendChild(selectMin);
  div.appendChild(tdInicio);
  div.appendChild(tdFin);
  div.appendChild(del);
  list.appendChild(div);
  calcTotal();
}

/* ════════════════════════════════════════════════════
   CÁLCULO DE TIEMPOS
   ════════════════════════════════════════════════════ */
function minutosAHora(min) {
  const t = HORA_INICIO_H * 60 + HORA_INICIO_M + min;
  return String(Math.floor(t / 60) % 24).padStart(2,'0') + ':' + String(t % 60).padStart(2,'0');
}

function calcTotal() {
  let tPrograma = 0, cursor = T_APERTURA + T_CENA;

  document.querySelectorAll('#prog-list .prog-item').forEach(item => {
    const selects = item.querySelectorAll('select');
    const min     = parseInt(selects[1]?.value || selects[0]?.value || 0);
    const tdI = item.querySelector('.inicio-cell');
    const tdF = item.querySelector('.fin-cell');
    if (tdI) tdI.textContent = minutosAHora(cursor);
    cursor += min;
    if (tdF) tdF.textContent = minutosAHora(cursor);
    tPrograma += min;
  });

  const tTotal = T_APERTURA + T_CENA + tPrograma + T_CIERRE;
  document.getElementById('prog-time-label').textContent = tPrograma + ' min';

  const tDisp  = T_PROG_MAX - tPrograma;
  const dispEl = document.getElementById('tiempo-disponible');
  if (tDisp > 0) {
    dispEl.textContent = '✓ Quedan ' + tDisp + ' min disponibles para mensajes';
    dispEl.className   = 'tiempo-disponible ok';
  } else if (tDisp === 0) {
    dispEl.textContent = '✓ Tiempo del programa completo (' + T_PROG_MAX + '/' + T_PROG_MAX + ' min)';
    dispEl.className   = 'tiempo-disponible ok';
  } else {
    dispEl.textContent = '⚠ Excedido por ' + Math.abs(tDisp) + ' min (máx. ' + T_PROG_MAX + ' min)';
    dispEl.className   = 'tiempo-disponible over';
  }

  const totalEl = document.getElementById('total-display');
  totalEl.textContent = tTotal;
  totalEl.className   = tTotal > T_TOTAL ? 'over' : tTotal >= T_TOTAL - 3 ? 'warn' : 'ok';

  const warningEl = document.getElementById('timer-warning');
  if (tTotal > T_TOTAL) {
    warningEl.className = 'timer-warning over'; warningEl.classList.remove('hidden');
    document.getElementById('warning-text').textContent =
      'La reunión excede ' + T_TOTAL + ' min por ' + (tTotal - T_TOTAL) + ' min.';
  } else if (tTotal >= T_TOTAL - 3) {
    warningEl.className = 'timer-warning warn'; warningEl.classList.remove('hidden');
    document.getElementById('warning-text').textContent =
      'Cerca del límite. Quedan ' + (T_TOTAL - tTotal) + ' min de margen.';
  } else {
    warningEl.className = 'hidden';
  }

  renderTimerSegments(T_APERTURA, T_CENA, tPrograma, T_CIERRE, tTotal);
}

function renderTimerSegments(ap, sc, prog, ci, total) {
  const bar  = document.getElementById('timer-segments');
  bar.innerHTML = '';
  const base = Math.max(total, T_TOTAL);
  [{ cls: 'apertura', val: ap }, { cls: 'santacena', val: sc },
   { cls: 'programa', val: prog }, { cls: 'cierre', val: ci }].forEach(s => {
    if (s.val <= 0) return;
    const d = document.createElement('div');
    d.className   = 'timer-seg ' + s.cls + (total > T_TOTAL ? ' over' : '');
    d.style.width = ((s.val / base) * 100).toFixed(1) + '%';
    d.title = s.cls + ': ' + s.val + ' min';
    bar.appendChild(d);
  });
}

/* ════════════════════════════════════════════════════
   IMPRIMIR — Vista resumida en una sola página
   ════════════════════════════════════════════════════ */
function imprimirUnaPage() {
  const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const esc    = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Fecha legible
  const fechaVal = getVal('fecha');
  let fechaFmt = fechaVal;
  try {
    fechaFmt = new Date(fechaVal + 'T12:00:00').toLocaleDateString('es-MX',
      { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    fechaFmt = fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1);
  } catch(_) {}

  // Helpers de HTML
  const pvRow = (label, val) =>
    `<div class="pv-row"><span class="pv-label">${esc(label)}:</span><span class="pv-dash"></span><span class="pv-val">${esc(val||'—')}</span></div>`;

  const pvBlock = (title, bodyHtml, full = false) =>
    `<div class="pv-block ${full?'pv-col-full':''}">
       <div class="pv-block-title">${esc(title)}</div>
       <div class="pv-block-body">${bodyHtml}</div>
     </div>`;

  const listVals = listId => Array.from(
    document.querySelectorAll('#'+listId+' input[type="text"]')
  ).map(i=>i.value.trim()).filter(Boolean);

  const pvBullets = items => items.length
    ? `<ul class="pv-bullets">${items.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`
    : '<span style="font-size:8pt;color:#888">—</span>';

  // Campos estáticos por sección (misma posición que en el HTML)
  const secInputs = (sectionIndex) =>
    Array.from(document.querySelectorAll(`.section:nth-of-type(${sectionIndex}) .section-body input[type="text"]`));

  const [preside, dirige, visitas] = secInputs(1).map(e=>e.value.trim());
  const [himnoApert, dirigeMus1, oracionApert, piano] = secInputs(3).map(e=>e.value.trim());
  const [himnoCena, bendice, reparte] = secInputs(5).map(e=>e.value.trim());
  const cierreSec = Array.from(document.querySelectorAll('.section:nth-of-type(7) .section-body input[type="text"]'))
    .filter(el=>el.id!=='hermano-cierre').map(e=>e.value.trim());
  const [himnoFinal, dirigeMus2, oracionFinal] = cierreSec;

  // Programa principal
  const progItems = Array.from(document.querySelectorAll('#prog-list .prog-item')).map(item=>({
    nombre: item.querySelectorAll('input')[0]?.value || '',
    tipo:   item.querySelectorAll('select')[0]?.value || '',
    min:    item.querySelectorAll('select')[1]?.value || '',
    inicio: item.querySelector('.inicio-cell')?.textContent || '',
    fin:    item.querySelector('.fin-cell')?.textContent || '',
  }));

  const tablaProgHTML = progItems.length
    ? `<table class="pv-table">
        <tr><th>Nombre / Tema</th><th>Tipo</th><th>Min</th><th>Inicio</th><th>Fin</th></tr>
        ${progItems.map(p=>`<tr>
          <td>${esc(p.nombre)}</td><td>${esc(p.tipo)}</td>
          <td style="text-align:center">${esc(p.min)}'</td>
          <td style="text-align:center">${esc(p.inicio)}</td>
          <td style="text-align:center">${esc(p.fin)}</td>
        </tr>`).join('')}
       </table>`
    : '<span style="font-size:8pt;color:#888">Sin elementos</span>';

  // Asuntos (solo los activos)
  let asuntosHTML = '';
  if (document.getElementById('chkEstaca').checked) {
    const pres = document.querySelector('#estaca-block input')?.value.trim()||'';
    asuntosHTML += pvRow('Asuntos de Estaca — Presentados por', pres);
  }
  if (document.getElementById('chkRelevos').checked) {
    const rels = listVals('relevos-list');
    asuntosHTML += `<div class="pv-label" style="margin-bottom:1pt">Relevos:</div>${pvBullets(rels)}`;
  }
  if (document.getElementById('chkSost').checked) {
    const sosts = listVals('sost-list');
    asuntosHTML += `<div class="pv-label" style="margin-top:3pt;margin-bottom:1pt">Sostenimientos:</div>${pvBullets(sosts)}`;
  }
  if (!asuntosHTML) asuntosHTML = '<span style="font-size:8pt;color:#888">Sin asuntos esta semana</span>';

  // Anuncios
  const anuncios = listVals('anuncios-list');

  // Cierre
  const hernanoCierre = getVal('hermano-cierre');
  let cierreHTML = '';
  cierreHTML += pvRow('Para finalizar escucharemos al Hno.(a)', hernanoCierre);
  if (tiempoFinalMin) cierreHTML += pvRow('Tiempo asignado', tiempoFinalMin + ' min');
  cierreHTML += pvRow('Último Himno', himnoFinal);
  cierreHTML += pvRow('Dirige la Música', dirigeMus2);
  cierreHTML += pvRow('Oración Final', oracionFinal);

  // Construir HTML final
  const html = `
    <div class="pv-header">
      <div class="pv-church">La Iglesia de Jesucristo de los Santos de los Últimos Días</div>
      <div class="pv-title">⛪ Agenda de Reunión Sacramental</div>
      <div class="pv-meta">Estaca Cuernavaca &nbsp;·&nbsp; Barrio: <strong>${esc(getVal('barrio')||'—')}</strong> &nbsp;·&nbsp; ${esc(fechaFmt)} &nbsp;·&nbsp; Asistencia: <strong>${esc(getVal('asistencia')||'—')}</strong></div>
    </div>

    <div class="pv-grid">
      ${pvBlock('1. Preludio y Apertura',
        pvRow('Preside', preside) + pvRow('Dirige', dirige) + pvRow('Visitantes', visitas)
      )}
      ${pvBlock('3. Himno de Apertura y Oración',
        pvRow('Himno No. y Título', himnoApert) + pvRow('Dirige la Música', dirigeMus1) +
        pvRow('Oración de Apertura', oracionApert) + pvRow('Al Piano / Órgano', piano)
      )}
      ${pvBlock('2. Anuncios',
        pvBullets(anuncios)
      )}
      ${pvBlock('4. Asuntos de Barrio y Estaca',
        asuntosHTML
      )}
      ${pvBlock('5. Himno Sacramental y Santa Cena',
        pvRow('Himno Sacramental', himnoCena) + pvRow('Bendice', bendice) + pvRow('Reparte', reparte) +
        `<div class="pv-script">Queremos expresar nuestro agradecimiento a los Hermanos que nos ayudaron con la administración de la Santa Cena.</div>`
      )}
      ${pvBlock('7. Cierre', cierreHTML)}
      ${pvBlock('6. Programa Principal', tablaProgHTML, true)}
    </div>

    <div class="pv-footer">"Haced todas las cosas con orden y decencia ante Dios." — D&amp;C 20:68</div>
  `;

  const pv = document.getElementById('print-view');
  pv.innerHTML = html;
  window.print();
}

/* ════════════════════════════════════════════════════
   AGENDAS GUARDADAS — múltiples registros
   ════════════════════════════════════════════════════ */
const SAVED_KEY = 'agenda_estaca_saved_v1';

function listarGuardadas() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch(_) { return []; }
}

function persistirGuardadas(lista) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(lista));
}

function guardarComoAgenda() {
  const barrio = document.getElementById('barrio').value.trim() || 'Sin barrio';
  const fecha  = document.getElementById('fecha').value || new Date().toISOString().split('T')[0];
  const nombre = barrio + ' — ' + fecha;
  const estado = recopilarEstado();
  estado.nombre = nombre;

  const lista = listarGuardadas();
  // Verificar si ya existe una para ese mismo barrio+fecha
  const existente = lista.findIndex(a => a.nombre === nombre);
  if (existente >= 0) {
    if (!confirm('Ya existe una agenda guardada para "' + nombre + '".\n¿Deseas sobreescribirla?')) return;
    lista[existente] = estado;
  } else {
    lista.unshift(estado);            // más reciente primero
    if (lista.length > 30) lista.pop(); // máximo 30 agendas
  }

  persistirGuardadas(lista);
  actualizarBadgeGuardadas();
  mostrarEstadoCache('📌 Agenda guardada: ' + nombre, 4000);
}

function cargarAgendaGuardada(nombre) {
  const lista = listarGuardadas();
  const estado = lista.find(a => a.nombre === nombre);
  if (!estado) return;

  if (!confirm('¿Cargar la agenda "' + nombre + '"?\nLos datos actuales sin guardar se perderán.')) return;
  cerrarPanelGuardadas();

  // Limpiar primero
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
  document.getElementById('fecha').valueAsDate = new Date();
  ['anuncios-list','relevos-list','sost-list','prog-list'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  ['chkEstaca','chkRelevos','chkSost'].forEach(id => { document.getElementById(id).checked = false; });
  document.getElementById('estaca-block').classList.add('hidden');
  tiempoFinalMin = 0;
  document.getElementById('tiempo-selected').textContent = '';
  document.querySelectorAll('.tiempo-btn').forEach(b => b.classList.remove('active'));

  // Cargar datos
  Object.entries(estado.campos || {}).forEach(([id, val]) => {
    const el = document.getElementById(id); if (el) el.value = val;
  });
  Object.entries(estado.checks || {}).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.checked = val; if (id==='chkEstaca') document.getElementById('estaca-block').classList.toggle('hidden',!val); }
  });
  Object.entries(estado.listas || {}).forEach(([listId, valores]) => {
    const btn = document.querySelector('.add-btn[data-list="'+listId+'"]');
    const ph  = btn ? btn.dataset.placeholder : 'Ítem';
    valores.forEach(val => {
      addSimpleItem(listId, ph);
      const items = document.querySelectorAll('#'+listId+' input[type="text"]');
      if (items.length) items[items.length-1].value = val;
    });
  });
  (estado.programa || []).forEach(p => {
    addProgItem();
    const items = document.querySelectorAll('#prog-list .prog-item');
    const last  = items[items.length-1];
    if (!last) return;
    const inputs  = last.querySelectorAll('input');
    const selects = last.querySelectorAll('select');
    if (inputs[0])  inputs[0].value  = p.nombre;
    if (selects[0]) selects[0].value = p.tipo;
    if (selects[1]) selects[1].value = p.min;
  });
  tiempoFinalMin = estado.tiempoFinalMin || 0;
  if (tiempoFinalMin > 0) {
    const btn = document.querySelector('.tiempo-btn[data-min="'+tiempoFinalMin+'"]');
    if (btn) btn.classList.add('active');
    document.getElementById('tiempo-selected').textContent = '⏱ '+tiempoFinalMin+' min para el mensaje de cierre';
  }
  calcTotal();
  mostrarEstadoCache('📂 Agenda cargada: ' + nombre, 4000);
}

function eliminarAgendaGuardada(nombre) {
  if (!confirm('¿Eliminar la agenda "' + nombre + '"? Esta acción no se puede deshacer.')) return;
  const lista = listarGuardadas().filter(a => a.nombre !== nombre);
  persistirGuardadas(lista);
  actualizarBadgeGuardadas();
  renderPanelGuardadas();
}

function actualizarBadgeGuardadas() {
  const n = listarGuardadas().length;
  const badge = document.getElementById('saved-badge');
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);
}

function renderPanelGuardadas() {
  const lista = listarGuardadas();
  const body  = document.getElementById('saved-body');
  if (!lista.length) {
    body.innerHTML = '<div class="saved-empty">📭 No tienes agendas guardadas todavía.<br><small>Usa "Guardar como agenda" para guardar múltiples versiones.</small></div>';
    return;
  }
  body.innerHTML = lista.map(a => {
    const ts = a.timestamp ? new Date(a.timestamp).toLocaleString('es-MX') : '';
    const barrio = a.campos?.barrio || '';
    const fecha  = a.campos?.fecha  || '';
    return `<div class="saved-item">
      <div class="saved-item-info">
        <div class="saved-item-title">${a.nombre || 'Agenda sin nombre'}</div>
        <div class="saved-item-meta">${ts ? 'Guardada: ' + ts : ''}</div>
      </div>
      <div class="saved-item-actions">
        <button class="saved-load-btn" onclick="cargarAgendaGuardada(${JSON.stringify(a.nombre)})">Cargar</button>
        <button class="saved-del-btn"  onclick="eliminarAgendaGuardada(${JSON.stringify(a.nombre)})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function abrirPanelGuardadas() {
  renderPanelGuardadas();
  document.getElementById('saved-panel').classList.add('open');
}

function cerrarPanelGuardadas() {
  document.getElementById('saved-panel').classList.remove('open');
}
function limpiarAgenda() {
  if (!confirm('¿Limpiar todos los campos y empezar desde cero?\n(El borrador guardado también se borrará)')) return;
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
  document.getElementById('fecha').valueAsDate = new Date();
  ['anuncios-list','relevos-list','sost-list','prog-list'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  ['chkEstaca','chkRelevos','chkSost'].forEach(id => { document.getElementById(id).checked = false; });
  document.getElementById('estaca-block').classList.add('hidden');
  tiempoFinalMin = 0;
  document.getElementById('tiempo-selected').textContent = '';
  document.querySelectorAll('.tiempo-btn').forEach(b => b.classList.remove('active'));
  try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  mostrarEstadoCache('🗑️ Agenda limpiada. Borrador eliminado.', 4000);
  calcTotal();
}
