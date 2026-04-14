/* ===================================================
   Agenda Reunión Sacramental — Barrio Burgos
   app.js — Lógica de la aplicación
   =================================================== */

let tiempoFinal = 0;

/* ─── Inicialización ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Fecha de hoy por defecto
  const fechaInput = document.getElementById('fecha');
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.value = hoy;

  // Checkbox Asuntos de Estaca
  document.getElementById('chkEstaca').addEventListener('change', function () {
    document.getElementById('estaca-block').classList.toggle('hidden', !this.checked);
  });

  // Botones Agregar genéricos (anuncios, relevos, sostenimientos)
  document.querySelectorAll('.add-btn[data-list]').forEach(btn => {
    btn.addEventListener('click', () => {
      addSimpleItem(btn.dataset.list, btn.dataset.placeholder);
    });
  });

  // Botón Agregar Elemento al programa principal
  document.getElementById('add-prog-btn').addEventListener('click', addProgItem);

  // Botones de tiempo para mensaje final
  document.querySelectorAll('.tiempo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tiempo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tiempoFinal = parseInt(btn.dataset.min);
      document.getElementById('tiempo-selected').textContent =
        '⏱ ' + tiempoFinal + ' min seleccionados para el mensaje final';
      calcTotal();
    });
  });

  // Botones del pie
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-pdf').addEventListener('click', exportarPDF);
  document.getElementById('btn-blank').addEventListener('click', limpiarAgenda);
});

/* ─── Agregar ítem simple (texto + botón eliminar) ── */
function addSimpleItem(listId, placeholder) {
  const list = document.getElementById(listId);
  const div = document.createElement('div');
  div.className = 'dyn-item';
  div.innerHTML = `
    <input type="text" placeholder="${placeholder}" />
    <button class="del-btn" title="Eliminar">×</button>
  `;
  div.querySelector('.del-btn').addEventListener('click', () => {
    div.remove();
    calcTotal();
  });
  list.appendChild(div);
}

/* ─── Agregar elemento al programa principal ──────── */
function addProgItem() {
  const list = document.getElementById('prog-list');
  const div = document.createElement('div');
  div.className = 'dyn-item prog-item';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nombre / tema del mensaje';

  const select = document.createElement('select');
  const opciones = [3, 5, 7, 10, 15, 20, 25];
  opciones.forEach(min => {
    const opt = document.createElement('option');
    opt.value = min;
    opt.textContent = min + ' min';
    if (min === 5) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', calcTotal);

  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.title = 'Eliminar';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', () => {
    div.remove();
    calcTotal();
  });

  div.appendChild(input);
  div.appendChild(select);
  div.appendChild(delBtn);
  list.appendChild(div);
  calcTotal();
}

/* ─── Calcular tiempo total ───────────────────────── */
function calcTotal() {
  let total = 15; // apertura + santa cena fijos

  document.querySelectorAll('#prog-list select').forEach(sel => {
    total += parseInt(sel.value);
  });

  total += tiempoFinal;
  total += 5; // cierre fijo

  document.getElementById('total-display').textContent = total + ' min';
}

/* ─── Exportar PDF (instrucción al usuario) ───────── */
function exportarPDF() {
  alert('Para exportar como PDF:\n1. Haz clic en "Imprimir" (o presiona Ctrl+P / Cmd+P).\n2. En el destino, selecciona "Guardar como PDF".\n3. Haz clic en Guardar.');
}

/* ─── Limpiar agenda ──────────────────────────────── */
function limpiarAgenda() {
  if (!confirm('¿Deseas limpiar todos los campos y volver a la agenda en blanco?')) return;

  // Limpiar inputs de texto y número
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
    input.value = '';
  });

  // Restablecer fecha
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;

  // Eliminar ítems dinámicos
  ['anuncios-list', 'relevos-list', 'sost-list', 'prog-list'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });

  // Restablecer checkboxes
  ['chkEstaca', 'chkRelevos', 'chkSost'].forEach(id => {
    document.getElementById(id).checked = false;
  });
  document.getElementById('estaca-block').classList.add('hidden');

  // Restablecer tiempo final
  tiempoFinal = 0;
  document.getElementById('tiempo-selected').textContent = '';
  document.querySelectorAll('.tiempo-btn').forEach(b => b.classList.remove('active'));

  calcTotal();
}
