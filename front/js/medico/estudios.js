/**
 * medico/estudios.js — Estudios for the logged-in Medico
 */

requireAuth('MEDICO');
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
let editingId  = null;
let deletingId = null;
const medicoId = getCurrentMedicoId();

const ESTUDIO_TIPOS = {
  GENERICO: 'Genérico',
  RADIOGRAFIA: 'Radiografía',
  ECOGRAFIA: 'Ecografía',
  LABORATORIO: 'Laboratorio',
  TOMOGRAFIA: 'Tomografía',
};

const ESTUDIO_COMPLEJIDADES = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

const ESTUDIO_DETALLES = {
  GENERICO: [],
  RADIOGRAFIA: [
    { key: 'regionAnatomica', label: 'Región anatómica', type: 'text', placeholder: 'Ej. Tórax' },
    { key: 'lateralidad', label: 'Lateralidad', type: 'select', options: ['Izquierda', 'Derecha', 'Bilateral'] },
    { key: 'proyeccion', label: 'Proyección', type: 'text', placeholder: 'Ej. Frontal y lateral' },
    { key: 'contraste', label: 'Con contraste', type: 'select', options: ['No', 'Sí'] },
  ],
  ECOGRAFIA: [
    { key: 'zonaEstudio', label: 'Zona estudiada', type: 'text', placeholder: 'Ej. Abdomen superior' },
    { key: 'ayuno', label: 'Ayuno previo', type: 'select', options: ['No', 'Sí'] },
    { key: 'via', label: 'Vía de estudio', type: 'select', options: ['Abdominal', 'Transvaginal', 'Partes blandas'] },
    { key: 'hallazgos', label: 'Hallazgos', type: 'textarea', placeholder: 'Breve descripción de hallazgos' },
  ],
  LABORATORIO: [
    { key: 'muestra', label: 'Tipo de muestra', type: 'select', options: ['Sangre', 'Orina', 'Heces', 'Hisopado'] },
    { key: 'panel', label: 'Panel / análisis', type: 'text', placeholder: 'Ej. Hemograma completo' },
    { key: 'ayuno', label: 'Ayuno previo', type: 'select', options: ['No', 'Sí'] },
    { key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Rutina', 'Urgente'] },
  ],
  TOMOGRAFIA: [
    { key: 'region', label: 'Región estudiada', type: 'text', placeholder: 'Ej. Cráneo' },
    { key: 'contraste', label: 'Con contraste', type: 'select', options: ['No', 'Sí'] },
    { key: 'sedacion', label: 'Sedación', type: 'select', options: ['No', 'Sí'] },
    { key: 'observacionesTecnicas', label: 'Observaciones técnicas', type: 'textarea', placeholder: 'Ej. Cortes axiales sin incidencias' },
  ],
};

const modalEl      = document.getElementById('modal-estudio');
const confirmEl    = document.getElementById('modal-confirm');
const modal        = new bootstrap.Modal(modalEl);
const confirmModal = new bootstrap.Modal(confirmEl);
const form         = document.getElementById('form-estudio');
const tbody        = document.getElementById('tbody-estudios');
const detailsContainer = document.getElementById('e-detalles-container');

/* ── Load ── */
async function loadData() {
  tbody.innerHTML = '<tr class="loading-row"><td colspan="8"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando…</td></tr>';
  try {
    [estudios, pacientes] = await Promise.all([
      apiGet('/estudios'),
      apiGet('/pacientes'),
    ]);
    renderTable();
    populateSelects();
    populatePacienteSelect();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ── Render ── */
function renderTable() {
  tbody.innerHTML = '';
  const myEstudios = Array.isArray(estudios) ? estudios : [];

  if (myEstudios.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'text-center py-4 text-muted';
    td.textContent = 'No tiene estudios registrados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  myEstudios.forEach(e => {
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

    tr.appendChild(tdText(formatDate(e.fecha)));
    tr.appendChild(tdText(e.nombre || '—'));
    tr.appendChild(tdText(formatStudyType(e.tipoEstudio)));
    tr.appendChild(tdText(pacNombre));

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

function formatStudyType(type) {
  return ESTUDIO_TIPOS[type] || ESTUDIO_TIPOS.GENERICO;
}

function parseDetalleValues(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function renderDetailFields(tipo, values = {}) {
  detailsContainer.innerHTML = '';
  const schema = ESTUDIO_DETALLES[tipo] || [];

  if (schema.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-muted small';
    empty.textContent = 'El estudio genérico no requiere campos adicionales.';
    detailsContainer.appendChild(empty);
    return;
  }

  const row = document.createElement('div');
  row.className = 'row g-3';

  schema.forEach((field) => {
    const col = document.createElement('div');
    col.className = field.type === 'textarea' ? 'col-12' : 'col-md-6';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = field.label;

    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      input.appendChild(new Option('Seleccionar…', ''));
      field.options.forEach((option) => {
        input.appendChild(new Option(option, option));
      });
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder || '';
    }

    input.className = 'form-control';
    input.dataset.detailKey = field.key;
    if (values[field.key] != null && values[field.key] !== '') {
      input.value = values[field.key];
    }

    col.appendChild(label);
    col.appendChild(input);
    row.appendChild(col);
  });

  detailsContainer.appendChild(row);
}

function collectDetailValues() {
  const data = {};
  detailsContainer.querySelectorAll('[data-detail-key]').forEach((input) => {
    const value = input.value.trim();
    if (value) {
      data[input.dataset.detailKey] = value;
    }
  });
  return data;
}

/* ── Paciente select (only this medico's patients) ── */
function populateSelects() {
  const selTipo = document.getElementById('e-tipoEstudio');
  const selComp = document.getElementById('e-complejidad');

  if (selTipo) {
    selTipo.innerHTML = '';
    Object.entries(ESTUDIO_TIPOS).forEach(([value, label]) => {
      selTipo.appendChild(new Option(label, value));
    });
  }

  if (selComp) {
    selComp.innerHTML = '';
    Object.entries(ESTUDIO_COMPLEJIDADES).forEach(([value, label]) => {
      selComp.appendChild(new Option(label, value));
    });
  }
}

function populatePacienteSelect() {
  const sel = document.getElementById('e-pacienteId');
  sel.innerHTML = '';
  const def = document.createElement('option');
  def.value = ''; def.textContent = 'Seleccionar paciente…';
  sel.appendChild(def);

  // Filter to only this medico's patients
  const myPacientes = (pacientes || []).filter(p => {
    const pMedId = p.medicoId || p.medico?.id;
    return p.activo !== false && String(pMedId) === String(medicoId);
  });

  myPacientes.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre || ''} ${p.apellido || ''}`.trim();
    sel.appendChild(opt);
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

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('e-fecha').value = today;
  document.getElementById('e-tipoEstudio').value = 'GENERICO';
  document.getElementById('e-complejidad').value = 'BAJA';
  renderDetailFields('GENERICO');

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
  document.getElementById('e-tipoEstudio').value   = e.tipoEstudio || 'GENERICO';
  document.getElementById('e-complejidad').value   = e.complejidad || 'BAJA';
  renderDetailFields(document.getElementById('e-tipoEstudio').value, parseDetalleValues(e.detalles));

  const pId = e.pacienteId || e.paciente?.id;
  if (pId) document.getElementById('e-pacienteId').value = pId;

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

  if (hasFile && archivoInput.files[0].size > 10 * 1024 * 1024) {
    showToast('El archivo no puede superar los 10 MB.', 'warning');
    return;
  }

  setSaveLoading(true);
  try {
    const fd = new FormData();
    const detalleValues = collectDetailValues();
    const estudioData = {
      fecha:         document.getElementById('e-fecha').value,
      nombre:        document.getElementById('e-nombre').value.trim(),
      observaciones: document.getElementById('e-observaciones').value.trim(),
      pacienteId:    document.getElementById('e-pacienteId').value,
      medicoId:      medicoId,
      tipoEstudio:   document.getElementById('e-tipoEstudio').value,
      complejidad:   document.getElementById('e-complejidad').value,
      detalles:      Object.keys(detalleValues).length ? JSON.stringify(detalleValues) : null,
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
document.getElementById('e-tipoEstudio').addEventListener('change', (event) => {
  renderDetailFields(event.target.value);
});
document.getElementById('btn-nuevo-estudio').addEventListener('click', openCreate);
renderDetailFields('GENERICO');
loadData();
