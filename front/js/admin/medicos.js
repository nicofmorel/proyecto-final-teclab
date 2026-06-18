/**
 * admin/medicos.js — CRUD for Médicos
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
let medicos = [];
let editingId = null;
let deletingId = null;
let medicoAction = 'delete';

const modalEl       = document.getElementById('modal-medico');
const confirmEl     = document.getElementById('modal-confirm');
const modal         = new bootstrap.Modal(modalEl);
const confirmModal  = new bootstrap.Modal(confirmEl);
const form          = document.getElementById('form-medico');
const tbody         = document.getElementById('tbody-medicos');
const pwdGroup      = document.getElementById('m-password-group');
const pwdInput      = document.getElementById('m-password');

/* ── Load ── */
async function loadMedicos() {
  tbody.innerHTML = '<tr class="loading-row"><td colspan="8"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando…</td></tr>';
  try {
    medicos = await apiGet('/medicos');
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ── Render ── */
function renderTable() {
  tbody.innerHTML = '';
  if (!medicos || medicos.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'text-center py-4 text-muted';
    td.textContent = 'No hay médicos registrados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  medicos.forEach(m => {
    const tr = document.createElement('tr');

    const fullName = `${m.nombre || ''} ${m.apellido || ''}`.trim();
    const isActivo = m.activo !== false;

    tr.appendChild(tdText(fullName));
    tr.appendChild(tdText(m.documento || '—'));
    tr.appendChild(tdText(m.matricula || '—'));
    tr.appendChild(tdText(m.especialidad || '—'));
    tr.appendChild(tdText(m.mail || '—'));

    const tdRol = document.createElement('td');
    const rolBadge = document.createElement('span');
    rolBadge.className = m.rol === 'ADMIN' ? 'badge bg-primary' : 'badge bg-secondary';
    rolBadge.textContent = m.rol || '—';
    tdRol.appendChild(rolBadge);
    tr.appendChild(tdRol);

    const tdEstado = document.createElement('td');
    const estadoBadge = document.createElement('span');
    estadoBadge.className = isActivo ? 'badge-activo' : 'badge-inactivo';
    estadoBadge.textContent = isActivo ? 'Activo' : 'Inactivo';
    tdEstado.appendChild(estadoBadge);
    tr.appendChild(tdEstado);

    // Actions
    const tdAcc = document.createElement('td');
    tdAcc.style.whiteSpace = 'nowrap';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action btn btn-outline-primary me-1';
    btnEdit.title = 'Editar';
    btnEdit.innerHTML = '<i class="bi bi-pencil"></i>';
    btnEdit.addEventListener('click', () => openEdit(m));

    const btnDel = document.createElement('button');
    btnDel.className = isActivo ? 'btn-action btn btn-outline-danger' : 'btn-action btn btn-outline-success';
    btnDel.title = isActivo ? 'Dar de baja' : 'Reactivar';
    btnDel.innerHTML = isActivo ? '<i class="bi bi-person-x"></i>' : '<i class="bi bi-person-check"></i>';
    btnDel.addEventListener('click', () => {
      if (isActivo) {
        openConfirmDelete(m);
      } else {
        openConfirmReactivate(m);
      }
    });

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Open modals ── */
function openCreate() {
  editingId = null;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-medico-title').textContent = 'Nuevo Médico';
  // Password required on create
  pwdGroup.style.display = '';
  pwdInput.required = true;
  document.getElementById('btn-save-text').textContent = 'Guardar';
  modal.show();
}

function openEdit(m) {
  editingId = m.id;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-medico-title').textContent = 'Editar Médico';
  // Password not required on edit
  pwdGroup.style.display = 'none';
  pwdInput.required = false;
  pwdInput.value = '';

  document.getElementById('m-nombre').value      = m.nombre      || '';
  document.getElementById('m-apellido').value    = m.apellido    || '';
  document.getElementById('m-documento').value   = m.documento   || '';
  document.getElementById('m-matricula').value   = m.matricula   || '';
  document.getElementById('m-especialidad').value= m.especialidad|| '';
  document.getElementById('m-mail').value        = m.mail        || '';
  document.getElementById('m-rol').value         = m.rol         || '';

  document.getElementById('btn-save-text').textContent = 'Actualizar';
  modal.show();
}

function openConfirmDelete(m) {
  deletingId = m.id;
  medicoAction = 'delete';
  const name = `${m.nombre || ''} ${m.apellido || ''}`.trim();
  const p = document.getElementById('modal-confirm-text');
  p.textContent = `¿Está seguro que desea dar de baja al médico "${name}"?`;
  confirmModal.show();
}

function openConfirmReactivate(m) {
  deletingId = m.id;
  medicoAction = 'reactivate';
  const name = `${m.nombre || ''} ${m.apellido || ''}`.trim();
  const p = document.getElementById('modal-confirm-text');
  p.textContent = `¿Desea reactivar al médico "${name}"?`;
  confirmModal.show();
}

/* ── Save ── */
function setSaveLoading(loading) {
  document.getElementById('btn-save-medico').disabled = loading;
  document.getElementById('btn-save-text').textContent = loading ? 'Guardando…' : (editingId ? 'Actualizar' : 'Guardar');
  document.getElementById('btn-save-spinner').classList.toggle('d-none', !loading);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const payload = {
    nombre:       document.getElementById('m-nombre').value.trim(),
    apellido:     document.getElementById('m-apellido').value.trim(),
    documento:    document.getElementById('m-documento').value.trim(),
    matricula:    document.getElementById('m-matricula').value.trim(),
    especialidad: document.getElementById('m-especialidad').value.trim(),
    mail:         document.getElementById('m-mail').value.trim(),
    rol:          document.getElementById('m-rol').value,
  };

  if (!editingId) {
    payload.password = document.getElementById('m-password').value;
  }

  setSaveLoading(true);
  try {
    if (editingId) {
      await apiPut(`/medicos/${editingId}`, payload);
      showToast('Médico actualizado correctamente.', 'success');
    } else {
      await apiPost('/medicos', payload);
      showToast('Médico creado correctamente.', 'success');
    }
    modal.hide();
    await loadMedicos();
  } catch (err) {
    showToast(err.message || 'Error al guardar.', 'error');
  } finally {
    setSaveLoading(false);
  }
});

/* ── Delete ── */
function setDelLoading(loading) {
  document.getElementById('btn-confirm-delete').disabled = loading;
  const idleText = medicoAction === 'reactivate' ? 'Reactivar' : 'Dar de Baja';
  document.getElementById('btn-del-text').textContent = loading ? 'Procesando…' : idleText;
  document.getElementById('btn-del-spinner').classList.toggle('d-none', !loading);
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!deletingId) return;
  setDelLoading(true);
  try {
    if (medicoAction === 'reactivate') {
      await apiPost(`/medicos/${deletingId}/reactivar`, {});
      showToast('Médico reactivado correctamente.', 'success');
    } else {
      await apiDelete(`/medicos/${deletingId}`);
      showToast('Médico dado de baja correctamente.', 'success');
    }
    confirmModal.hide();
    await loadMedicos();
  } catch (err) {
    showToast(err.message || (medicoAction === 'reactivate' ? 'Error al reactivar.' : 'Error al dar de baja.'), 'error');
  } finally {
    setDelLoading(false);
    deletingId = null;
    medicoAction = 'delete';
  }
});

/* ── Init ── */
document.getElementById('btn-nuevo-medico').addEventListener('click', openCreate);

loadMedicos();
