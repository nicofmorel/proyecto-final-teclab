/**
 * admin/estudios.js — CRUD for Estudios (Admin view)
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
let estudios   = [];
let pacientes  = [];
let medicos    = [];
let editingId  = null;
let deletingId = null;

const modalEl      = document.getElementById('modal-estudio');
const confirmEl    = document.getElementById('modal-confirm');
const modal        = new bootstrap.Modal(modalEl);
const confirmModal = new bootstrap.Modal(confirmEl);
const form         = document.getElementById('form-estudio');
const tbody        = document.getElementById('tbody-estudios');

/* ── Load ── */
async function loadData() {
  tbody.innerHTML = '<tr class="loading-row"><td colspan="8"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando…</td></tr>';
  try {
    [estudios, pacientes, medicos] = await Promise.all([
      apiGet('/estudios'),
      apiGet('/pacientes'),
      apiGet('/medicos'),
    ]);
    renderTable();
    populateSelects();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ── Render ── */
function renderTable() {
  tbody.innerHTML = '';
  if (!estudios || estudios.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'text-center py-4 text-muted';
    td.textContent = 'No hay estudios registrados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  estudios.forEach(e => {
    const tr = document.createElement('tr');
    const isActivo = e.activo !== false;

    // Paciente name
    let pacNombre = '—';
    const pId = e.pacienteId || e.paciente?.id;
    if (e.paciente) {
      pacNombre = `${e.paciente.nombre || ''} ${e.paciente.apellido || ''}`.trim();
    } else if (pId) {
      const pac = pacientes.find(p => p.id == pId);
      if (pac) pacNombre = `${pac.nombre || ''} ${pac.apellido || ''}`.trim();
    }

    // Medico name
    let medNombre = '—';
    const mId = e.medicoId || e.medico?.id;
    if (e.medico) {
      medNombre = `${e.medico.nombre || ''} ${e.medico.apellido || ''}`.trim();
    } else if (mId) {
      const med = medicos.find(m => m.id == mId);
      if (med) medNombre = `${med.nombre || ''} ${med.apellido || ''}`.trim();
    }

    tr.appendChild(tdText(formatDate(e.fecha)));
    tr.appendChild(tdText(e.nombre || '—'));
    tr.appendChild(tdText(pacNombre));
    tr.appendChild(tdText(medNombre));

    // Observaciones truncated
    const tdObs = document.createElement('td');
    const obsSpan = document.createElement('span');
    obsSpan.className = 'text-truncate-150';
    obsSpan.title = e.observaciones || '';
    obsSpan.textContent = e.observaciones || '—';
    tdObs.appendChild(obsSpan);
    tr.appendChild(tdObs);

    // Archivo
    const tdArchivo = document.createElement('td');
    if (e.archivoPath || e.tieneArchivo) {
      const link = document.createElement('a');
      link.className = 'file-badge';
      link.href = '#';
      link.title = 'Ver / descargar archivo';
      link.innerHTML = '<i class="bi bi-paperclip"></i> Archivo';
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        viewArchivo(e.id);
      });
      tdArchivo.appendChild(link);
    } else {
      tdArchivo.textContent = '—';
    }
    tr.appendChild(tdArchivo);

    // Estado
    const tdEstado = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = isActivo ? 'badge-activo' : 'badge-inactivo';
    badge.textContent = isActivo ? 'Activo' : 'Inactivo';
    tdEstado.appendChild(badge);
    tr.appendChild(tdEstado);

    // Actions
    const tdAcc = document.createElement('td');
    tdAcc.style.whiteSpace = 'nowrap';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action btn btn-outline-primary me-1';
    btnEdit.title = 'Editar';
    btnEdit.innerHTML = '<i class="bi bi-pencil"></i>';
    btnEdit.addEventListener('click', () => openEdit(e));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-action btn btn-outline-danger';
    btnDel.title = isActivo ? 'Dar de baja' : 'Ya inactivo';
    btnDel.disabled = !isActivo;
    btnDel.innerHTML = '<i class="bi bi-trash"></i>';
    btnDel.addEventListener('click', () => openConfirmDelete(e));

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
function populateSelects() {
  const selPac = document.getElementById('e-pacienteId');
  const selMed = document.getElementById('e-medicoId');

  selPac.innerHTML = '';
  const defPac = document.createElement('option');
  defPac.value = ''; defPac.textContent = 'Seleccionar paciente…';
  selPac.appendChild(defPac);
  (pacientes || []).filter(p => p.activo !== false).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre || ''} ${p.apellido || ''}`.trim();
    selPac.appendChild(opt);
  });

  selMed.innerHTML = '';
  const defMed = document.createElement('option');
  defMed.value = ''; defMed.textContent = 'Seleccionar médico…';
  selMed.appendChild(defMed);
  (medicos || []).filter(m => m.activo !== false).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nombre || ''} ${m.apellido || ''}`.trim();
    selMed.appendChild(opt);
  });
}

/* ── View file ── */
async function viewArchivo(id) {
  try {
    const res = await apiGetRaw(`/estudios/${id}/archivo`);
    if (!res) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    showToast('No se pudo obtener el archivo: ' + err.message, 'error');
  }
}

/* ── Open modals ── */
function openCreate() {
  editingId = null;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-estudio-title').textContent = 'Nuevo Estudio';
  document.getElementById('e-archivo-actual-group').style.display = 'none';
  document.getElementById('btn-save-text').textContent = 'Guardar';

  // Set today as default date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('e-fecha').value = today;

  modal.show();
}

function openEdit(e) {
  editingId = e.id;
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('modal-estudio-title').textContent = 'Editar Estudio';

  document.getElementById('e-fecha').value         = e.fecha ? e.fecha.split('T')[0] : '';
  document.getElementById('e-nombre').value        = e.nombre        || '';
  document.getElementById('e-observaciones').value = e.observaciones || '';

  const pId = e.pacienteId || e.paciente?.id;
  if (pId) document.getElementById('e-pacienteId').value = pId;

  const mId = e.medicoId || e.medico?.id;
  if (mId) document.getElementById('e-medicoId').value = mId;

  // Show existing file info
  if (e.archivoPath || e.tieneArchivo) {
    document.getElementById('e-archivo-actual-group').style.display = '';
    const nombre = e.archivoPath ? e.archivoPath.split('/').pop() : 'Archivo adjunto';
    document.getElementById('e-archivo-nombre').textContent = nombre;
  } else {
    document.getElementById('e-archivo-actual-group').style.display = 'none';
  }

  document.getElementById('btn-save-text').textContent = 'Actualizar';
  modal.show();
}

function openConfirmDelete(e) {
  deletingId = e.id;
  document.getElementById('modal-confirm-text').textContent = `¿Está seguro que desea dar de baja el estudio "${e.nombre || ''}"?`;
  confirmModal.show();
}

/* ── Save ── */
function setSaveLoading(loading) {
  document.getElementById('btn-save-estudio').disabled = loading;
  document.getElementById('btn-save-text').textContent = loading ? 'Guardando…' : (editingId ? 'Actualizar' : 'Guardar');
  document.getElementById('btn-save-spinner').classList.toggle('d-none', !loading);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const archivoInput = document.getElementById('e-archivo');
  const hasFile = archivoInput.files && archivoInput.files.length > 0;

  // Validate file size (10 MB max)
  if (hasFile && archivoInput.files[0].size > 10 * 1024 * 1024) {
    showToast('El archivo no puede superar los 10 MB.', 'warning');
    return;
  }

  setSaveLoading(true);
  try {
    // Backend expects a JSON blob named "estudio" + optional file part "archivo"
    const fd = new FormData();
    const estudioData = {
      fecha:         document.getElementById('e-fecha').value,
      nombre:        document.getElementById('e-nombre').value.trim(),
      observaciones: document.getElementById('e-observaciones').value.trim(),
      pacienteId:    document.getElementById('e-pacienteId').value,
      medicoId:      document.getElementById('e-medicoId').value,
    };
    fd.append('estudio', new Blob([JSON.stringify(estudioData)], { type: 'application/json' }));
    if (hasFile) fd.append('archivo', archivoInput.files[0]);

    if (editingId) {
      await apiPutForm(`/estudios/${editingId}`, fd);
      showToast('Estudio actualizado correctamente.', 'success');
    } else {
      await apiPostForm('/estudios', fd);
      showToast('Estudio creado correctamente.', 'success');
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
    await apiDelete(`/estudios/${deletingId}`);
    showToast('Estudio dado de baja correctamente.', 'success');
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
document.getElementById('btn-nuevo-estudio').addEventListener('click', openCreate);
loadData();
