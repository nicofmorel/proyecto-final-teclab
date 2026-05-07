/**
 * admin/pacientes.js — CRUD for Pacientes (Admin view)
 */

requireAuth('ADMIN');
initSidebar();

/* ── Toast helper ── */
function showToast(message, type = 'info') {
  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast-custom toast-${type}`;

  const icon = document.createElement('i');
  icon.className = `bi ${icons[type] || icons.info} toast-custom-icon`;

  const body = document.createElement('div');
  body.className = 'toast-custom-body';
  body.textContent = message;

  const close = document.createElement('button');
  close.className = 'toast-custom-close';
  close.innerHTML = '<i class="bi bi-x-lg"></i>';
  close.addEventListener('click', () => toast.remove());

  toast.appendChild(icon);
  toast.appendChild(body);
  toast.appendChild(close);
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4500);
}

/* ── State ── */
let pacientes = [];
let medicos   = [];
let editingId = null;
let deletingId = null;

const modalEl      = document.getElementById('modal-paciente');
const confirmEl    = document.getElementById('modal-confirm');
const modal        = new bootstrap.Modal(modalEl);
const confirmModal = new bootstrap.Modal(confirmEl);
const form         = document.getElementById('form-paciente');
const tbody        = document.getElementById('tbody-pacientes');

/* ── Load ── */
async function loadData() {
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando…</td></tr>';
  try {
    [pacientes, medicos] = await Promise.all([
      apiGet('/pacientes'),
      apiGet('/medicos'),
    ]);
    renderTable();
    populateMedicoSelect();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ── Render ── */
function renderTable() {
  tbody.innerHTML = '';
  if (!pacientes || pacientes.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'text-center py-4 text-muted';
    td.textContent = 'No hay pacientes registrados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  pacientes.forEach(p => {
    const tr = document.createElement('tr');
    const isActivo = p.activo !== false;
    const fullName = `${p.nombre || ''} ${p.apellido || ''}`.trim();

    // Find assigned medico name
    let medicoNombre = '—';
    if (p.medicoId || p.medico?.id) {
      const mId = p.medicoId || p.medico?.id;
      const med = medicos.find(m => m.id == mId);
      if (med) medicoNombre = `${med.nombre || ''} ${med.apellido || ''}`.trim();
    } else if (p.medico) {
      medicoNombre = `${p.medico.nombre || ''} ${p.medico.apellido || ''}`.trim();
    }

    tr.appendChild(tdText(fullName));
    tr.appendChild(tdText(formatDate(p.fechaNacimiento)));
    tr.appendChild(tdText(p.mail || '—'));
    tr.appendChild(tdText(p.telefono || '—'));
    tr.appendChild(tdText(medicoNombre));

    const tdEstado = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = isActivo ? 'badge-activo' : 'badge-inactivo';
    badge.textContent = isActivo ? 'Activo' : 'Inactivo';
    tdEstado.appendChild(badge);
    tr.appendChild(tdEstado);

    const tdAcc = document.createElement('td');
    tdAcc.style.whiteSpace = 'nowrap';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action btn btn-outline-primary me-1';
    btnEdit.title = 'Editar';
    btnEdit.innerHTML = '<i class="bi bi-pencil"></i>';
    btnEdit.addEventListener('click', () => openEdit(p));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-action btn btn-outline-danger';
    btnDel.title = isActivo ? 'Dar de baja' : 'Ya inactivo';
    btnDel.disabled = !isActivo;
    btnDel.innerHTML = '<i class="bi bi-person-x"></i>';
    btnDel.addEventListener('click', () => openConfirmDelete(p));

    tdAcc.appendChild(btnEdit);
    tdAcc.appendChild(btnDel);
    tr.appendChild(tdAcc);

    tbody.appendChild(tr);
  });
}

function tdText(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  } catch { return dateStr; }
}

/* ── Selects ── */
function populateMedicoSelect() {
  const sel = document.getElementById('p-medicoId');
  sel.innerHTML = '';
  const def = document.createElement('option');
  def.value = '';
  def.textContent = 'Seleccionar médico…';
  sel.appendChild(def);
  (medicos || []).filter(m => m.activo !== false).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nombre || ''} ${m.apellido || ''}`.trim();
    sel.appendChild(opt);
  });
}

/* ── Open modals ── */
function openCreate() {
  editingId = null;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-paciente-title').textContent = 'Nuevo Paciente';
  document.getElementById('btn-save-text').textContent = 'Guardar';
  modal.show();
}

function openEdit(p) {
  editingId = p.id;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-paciente-title').textContent = 'Editar Paciente';

  document.getElementById('p-nombre').value         = p.nombre         || '';
  document.getElementById('p-apellido').value       = p.apellido       || '';
  document.getElementById('p-fechaNacimiento').value= p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '';
  document.getElementById('p-mail').value           = p.mail           || '';
  document.getElementById('p-telefono').value       = p.telefono       || '';

  const mId = p.medicoId || p.medico?.id;
  if (mId) document.getElementById('p-medicoId').value = mId;

  document.getElementById('btn-save-text').textContent = 'Actualizar';
  modal.show();
}

function openConfirmDelete(p) {
  deletingId = p.id;
  const name = `${p.nombre || ''} ${p.apellido || ''}`.trim();
  document.getElementById('modal-confirm-text').textContent = `¿Está seguro que desea dar de baja al paciente "${name}"?`;
  confirmModal.show();
}

/* ── Save ── */
function setSaveLoading(loading) {
  document.getElementById('btn-save-paciente').disabled = loading;
  document.getElementById('btn-save-text').textContent = loading ? 'Guardando…' : (editingId ? 'Actualizar' : 'Guardar');
  document.getElementById('btn-save-spinner').classList.toggle('d-none', !loading);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const payload = {
    nombre:          document.getElementById('p-nombre').value.trim(),
    apellido:        document.getElementById('p-apellido').value.trim(),
    fechaNacimiento: document.getElementById('p-fechaNacimiento').value,
    mail:            document.getElementById('p-mail').value.trim() || null,
    telefono:        document.getElementById('p-telefono').value.trim() || null,
    medicoId:        parseInt(document.getElementById('p-medicoId').value, 10),
  };

  setSaveLoading(true);
  try {
    if (editingId) {
      await apiPut(`/pacientes/${editingId}`, payload);
      showToast('Paciente actualizado correctamente.', 'success');
    } else {
      await apiPost('/pacientes', payload);
      showToast('Paciente creado correctamente.', 'success');
    }
    modal.hide();
    await loadData();
  } catch (err) {
    showToast(err.message || 'Error al guardar.', 'error');
  } finally {
    setSaveLoading(false);
  }
});

/* ── Delete ── */
function setDelLoading(loading) {
  document.getElementById('btn-confirm-delete').disabled = loading;
  document.getElementById('btn-del-text').textContent = loading ? 'Procesando…' : 'Dar de Baja';
  document.getElementById('btn-del-spinner').classList.toggle('d-none', !loading);
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!deletingId) return;
  setDelLoading(true);
  try {
    await apiDelete(`/pacientes/${deletingId}`);
    showToast('Paciente dado de baja correctamente.', 'success');
    confirmModal.hide();
    await loadData();
  } catch (err) {
    showToast(err.message || 'Error al dar de baja.', 'error');
  } finally {
    setDelLoading(false);
    deletingId = null;
  }
});

/* ── Init ── */
document.getElementById('btn-nuevo-paciente').addEventListener('click', openCreate);
loadData();
