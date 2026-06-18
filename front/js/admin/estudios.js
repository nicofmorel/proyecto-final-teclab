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
let filterState = {
  q: '',
  tipo: '',
  paciente: '',
  medico: '',
  activo: '',
};

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
const detailEl     = document.getElementById('modal-detalle');
const modal        = new bootstrap.Modal(modalEl);
const confirmModal = new bootstrap.Modal(confirmEl);
const detailModal  = new bootstrap.Modal(detailEl);
const form         = document.getElementById('form-estudio');
const tbody        = document.getElementById('tbody-estudios');
const detailsContainer = document.getElementById('e-detalles-container');
const detailArchivoOpen = document.getElementById('d-archivo-open');
const detailPreview = document.getElementById('d-preview');
const detailExportPdf = document.getElementById('btn-export-pdf');
let currentDetailStudyId = null;
let currentDetailArchivoUrl = null;
const filterInputs = {
  q: document.getElementById('filter-q'),
  tipo: document.getElementById('filter-tipo'),
  paciente: document.getElementById('filter-paciente'),
  medico: document.getElementById('filter-medico'),
  activo: document.getElementById('filter-activo'),
};

/* ── Load ── */
async function loadData() {
  tbody.innerHTML = '<tr class="loading-row"><td colspan="10"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando…</td></tr>';
  try {
    [estudios, pacientes, medicos] = await Promise.all([
      apiGet('/estudios'),
      apiGet('/pacientes'),
      apiGet('/medicos'),
    ]);
    populateFilterOptions();
    renderTable();
    populateSelects();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ── Render ── */
function renderTable() {
  tbody.innerHTML = '';
  const visibleEstudios = getFilteredEstudios();

  if (!visibleEstudios || visibleEstudios.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 10;
    td.className = 'text-center py-4 text-muted';
    td.textContent = estudios && estudios.length ? 'No hay estudios que coincidan con los filtros.' : 'No hay estudios registrados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  visibleEstudios.forEach(e => {
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
    tr.appendChild(tdText(e.codigoEstudio || '—'));
    tr.appendChild(tdText(formatStudyType(e.tipoEstudio)));
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
      link.title = getArchivoNombre(e) || 'Ver / descargar archivo';
      const icon = document.createElement('i');
      icon.className = 'bi bi-paperclip';
      const label = document.createElement('span');
      label.textContent = ` ${getArchivoLabel(e) || 'Archivo Adjunto'}`;
      link.appendChild(icon);
      link.appendChild(label);
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

    const btnDetail = document.createElement('button');
    btnDetail.className = 'btn-action btn btn-outline-secondary me-1';
    btnDetail.title = 'Ver detalle';
    btnDetail.innerHTML = '<i class="bi bi-eye"></i>';
    btnDetail.addEventListener('click', () => openDetail(e.id));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-action btn btn-outline-danger';
    btnDel.title = isActivo ? 'Dar de baja' : 'Ya inactivo';
    btnDel.disabled = !isActivo;
    btnDel.innerHTML = '<i class="bi bi-trash"></i>';
    btnDel.addEventListener('click', () => openConfirmDelete(e));

    tdAcc.appendChild(btnEdit);
    tdAcc.appendChild(btnDetail);
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

function getArchivoLabel(estudio) {
  return estudio?.tieneArchivo ? 'Archivo Adjunto' : null;
}

function getArchivoNombre(estudio) {
  if (estudio?.archivoNombreOriginal) {
    return estudio.archivoNombreOriginal;
  }
  if (estudio?.archivoPath) {
    return estudio.archivoPath.split('/').pop();
  }
  return estudio?.tieneArchivo ? 'Archivo Adjunto' : null;
}

function renderDetailValue(value) {
  if (value == null || value === '') return '—';
  return escapeHtml(String(value));
}

function renderDetailObject(details) {
  const entries = Object.entries(parseDetalleValues(details));
  if (entries.length === 0) return '—';
  return entries.map(([key, value]) => `<div><strong>${escapeHtml(humanizeDetailKey(key))}:</strong> ${renderDetailValue(value)}</div>`).join('');
}

function humanizeDetailKey(key) {
  const labels = {
    regionAnatomica: 'Región anatómica',
    lateralidad: 'Lateralidad',
    proyeccion: 'Proyección',
    contraste: 'Contraste',
    zonaEstudio: 'Zona estudiada',
    ayuno: 'Ayuno previo',
    via: 'Vía',
    hallazgos: 'Hallazgos',
    muestra: 'Muestra',
    panel: 'Panel',
    prioridad: 'Prioridad',
    region: 'Región',
    sedacion: 'Sedación',
    observacionesTecnicas: 'Observaciones técnicas',
  };
  return labels[key] || key;
}

function getArchivoKind(filename, contentType = '') {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (contentType.includes('pdf') || ext === 'pdf') return 'pdf';
  if (contentType.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
  return 'other';
}

function clearArchivoPreview() {
  if (currentDetailArchivoUrl) {
    URL.revokeObjectURL(currentDetailArchivoUrl);
    currentDetailArchivoUrl = null;
  }
  if (detailPreview) {
    detailPreview.classList.add('text-center', 'text-muted');
    detailPreview.innerHTML = 'Sin archivo para previsualizar.';
  }
  if (detailArchivoOpen) {
    detailArchivoOpen.classList.add('d-none');
  }
}

function renderArchivoPreview({ blob, filename, contentType }) {
  clearArchivoPreview();
  if (!detailPreview) return;

  currentDetailArchivoUrl = URL.createObjectURL(blob);
  const kind = getArchivoKind(filename, contentType || blob.type || '');

  if (kind === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = currentDetailArchivoUrl;
    iframe.title = 'Vista previa del archivo';
    iframe.className = 'w-100 border-0 rounded';
    iframe.style.minHeight = '420px';
    detailPreview.innerHTML = '';
    detailPreview.classList.remove('text-center', 'text-muted');
    detailPreview.appendChild(iframe);
  } else if (kind === 'image') {
    const img = document.createElement('img');
    img.src = currentDetailArchivoUrl;
    img.alt = 'Vista previa del archivo';
    img.className = 'img-fluid rounded';
    img.style.maxHeight = '420px';
    detailPreview.innerHTML = '';
    detailPreview.classList.remove('text-center', 'text-muted');
    detailPreview.appendChild(img);
  } else {
    detailPreview.textContent = 'Este tipo de archivo no admite vista previa inline. Usá el botón para abrirlo.';
    detailPreview.classList.add('text-center', 'text-muted');
  }

  if (detailArchivoOpen) {
    detailArchivoOpen.classList.remove('d-none');
  }
}

async function fetchArchivoBlob(id) {
  const res = await apiGetRaw(`/estudios/${id}/archivo`);
  if (!res) return null;
  return {
    blob: await res.blob(),
    contentType: res.headers.get('content-type') || '',
  };
}

async function exportStudyPdf(id) {
  const res = await apiGetRaw(`/estudios/${id}/pdf`);
  if (!res) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `estudio-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
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
    input.required = true;
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

async function openDetail(id) {
  try {
    currentDetailStudyId = id;
    clearArchivoPreview();
    const estudio = await apiGet(`/estudios/${id}`);
    const archivoNombre = getArchivoNombre(estudio) || 'Sin archivo adjunto';
    document.getElementById('d-fecha').textContent = formatDate(estudio.fecha);
    document.getElementById('d-codigo').textContent = estudio.codigoEstudio || '—';
    document.getElementById('d-tipo').textContent = formatStudyType(estudio.tipoEstudio);
    document.getElementById('d-complejidad').textContent = ESTUDIO_COMPLEJIDADES[estudio.complejidad] || '—';
    document.getElementById('d-nombre').textContent = estudio.nombre || '—';
    document.getElementById('d-estado').textContent = estudio.activo === false ? 'Inactivo' : 'Activo';
    document.getElementById('d-paciente').textContent = estudio.pacienteNombre || `${estudio.paciente?.nombre || ''} ${estudio.paciente?.apellido || ''}`.trim() || '—';
    document.getElementById('d-medico').textContent = estudio.medicoNombre || `${estudio.medico?.nombre || ''} ${estudio.medico?.apellido || ''}`.trim() || '—';
    document.getElementById('d-observaciones').innerHTML = renderDetailValue(estudio.observaciones);
    document.getElementById('d-detalles').innerHTML = renderDetailObject(estudio.detalles);
    document.getElementById('d-archivo').textContent = archivoNombre;
    detailModal.show();
    if (estudio.archivoPath || estudio.tieneArchivo) {
      try {
        const archivo = await fetchArchivoBlob(id);
        if (archivo) {
          renderArchivoPreview({
            ...archivo,
            filename: getArchivoNombre(estudio) || '',
          });
        }
      } catch (previewErr) {
        detailPreview.textContent = 'No se pudo cargar la vista previa.';
        if (detailArchivoOpen) {
          detailArchivoOpen.classList.remove('d-none');
        }
      }
    }
  } catch (err) {
    showToast(err.message || 'No se pudo cargar el detalle.', 'error');
  }
}

/* ── Selects ── */
function populateFilterOptions() {
  const selectedTipo = filterState.tipo;
  const selectedPaciente = filterState.paciente;
  const selectedMedico = filterState.medico;
  const typeSelect = filterInputs.tipo;
  const patientSelect = filterInputs.paciente;
  const doctorSelect = filterInputs.medico;

  if (typeSelect) {
    typeSelect.innerHTML = '<option value="">Todos los tipos</option>';
    Object.entries(ESTUDIO_TIPOS).forEach(([value, label]) => {
      typeSelect.appendChild(new Option(label, value));
    });
  }

  if (patientSelect) {
    patientSelect.innerHTML = '<option value="">Todos los pacientes</option>';
    (pacientes || []).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre || ''} ${p.apellido || ''}`.trim();
      patientSelect.appendChild(opt);
    });
  }

  if (doctorSelect) {
    doctorSelect.innerHTML = '<option value="">Todos los médicos</option>';
    (medicos || []).forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre || ''} ${m.apellido || ''}`.trim();
      doctorSelect.appendChild(opt);
    });
  }

  if (typeSelect) typeSelect.value = selectedTipo;
  if (patientSelect) patientSelect.value = selectedPaciente;
  if (doctorSelect) doctorSelect.value = selectedMedico;
}

function getFilteredEstudios() {
  const q = filterState.q.trim().toLowerCase();
  return (estudios || []).filter((e) => {
    if (filterState.tipo && String(e.tipoEstudio || '') !== String(filterState.tipo)) return false;
    if (filterState.paciente && String(e.pacienteId || '') !== String(filterState.paciente)) return false;
    if (filterState.medico && String(e.medicoId || '') !== String(filterState.medico)) return false;
    if (filterState.activo !== '' && String(e.activo) !== String(filterState.activo)) return false;
    if (!q) return true;

    const haystack = [
      e.nombre,
      e.codigoEstudio,
      e.observaciones,
      e.tipoEstudio,
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(q);
  });
}

function syncFiltersFromUI() {
  filterState = {
    q: filterInputs.q?.value || '',
    tipo: filterInputs.tipo?.value || '',
    paciente: filterInputs.paciente?.value || '',
    medico: filterInputs.medico?.value || '',
    activo: filterInputs.activo?.value || '',
  };
  renderTable();
}

function populateSelects() {
  const selTipo = document.getElementById('e-tipoEstudio');
  const selComp = document.getElementById('e-complejidad');
  const selPac = document.getElementById('e-pacienteId');
  const selMed = document.getElementById('e-medicoId');

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
    const archivo = await fetchArchivoBlob(id);
    if (!archivo) return;
    const url = URL.createObjectURL(archivo.blob);
    window.open(url, '_blank', 'noopener');
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
  document.getElementById('e-codigoEstudio').value = 'Se generará automáticamente';

  // Set today as default date
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
  document.getElementById('e-codigoEstudio').value = e.codigoEstudio || '—';
  document.getElementById('e-observaciones').value = e.observaciones || '';
  document.getElementById('e-tipoEstudio').value   = e.tipoEstudio || 'GENERICO';
  document.getElementById('e-complejidad').value   = e.complejidad || 'BAJA';

  renderDetailFields(document.getElementById('e-tipoEstudio').value, parseDetalleValues(e.detalles));

  const pId = e.pacienteId || e.paciente?.id;
  if (pId) document.getElementById('e-pacienteId').value = pId;

  const mId = e.medicoId || e.medico?.id;
  if (mId) document.getElementById('e-medicoId').value = mId;

  // Show existing file info
  if (e.archivoPath || e.tieneArchivo) {
    document.getElementById('e-archivo-actual-group').style.display = '';
    const nombre = getArchivoNombre(e) || 'Archivo adjunto';
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
    const detalleValues = collectDetailValues();
    const estudioData = {
      fecha:         document.getElementById('e-fecha').value,
      nombre:        document.getElementById('e-nombre').value.trim(),
      observaciones: document.getElementById('e-observaciones').value.trim(),
      pacienteId:    document.getElementById('e-pacienteId').value,
      medicoId:      document.getElementById('e-medicoId').value,
      tipoEstudio:   document.getElementById('e-tipoEstudio').value,
      complejidad:   document.getElementById('e-complejidad').value,
      detalles:      Object.keys(detalleValues).length ? detalleValues : null,
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

if (detailArchivoOpen) {
  detailArchivoOpen.addEventListener('click', () => {
    if (currentDetailStudyId) viewArchivo(currentDetailStudyId);
  });
}

if (detailExportPdf) {
  detailExportPdf.addEventListener('click', async () => {
    if (!currentDetailStudyId) return;
    try {
      await exportStudyPdf(currentDetailStudyId);
    } catch (err) {
      showToast(err.message || 'No se pudo exportar el PDF.', 'error');
    }
  });
}

detailEl.addEventListener('hidden.bs.modal', () => {
  currentDetailStudyId = null;
  clearArchivoPreview();
});

/* ── Init ── */
document.getElementById('e-tipoEstudio').addEventListener('change', (event) => {
  renderDetailFields(event.target.value);
});
Object.values(filterInputs).forEach((input) => {
  if (!input) return;
  const eventName = input.tagName === 'INPUT' ? 'input' : 'change';
  input.addEventListener(eventName, syncFiltersFromUI);
});
document.getElementById('btn-nuevo-estudio').addEventListener('click', openCreate);
renderDetailFields('GENERICO');
loadData();
