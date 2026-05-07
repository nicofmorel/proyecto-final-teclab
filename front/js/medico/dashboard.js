/**
 * medico/dashboard.js — Medico home dashboard
 */

requireAuth('MEDICO');
initSidebar();

async function loadStats() {
  try {
    const [pacientes, estudios] = await Promise.all([
      apiGet('/pacientes'),
      apiGet('/estudios'),
    ]);

    document.getElementById('stat-pacientes').textContent =
      Array.isArray(pacientes) ? pacientes.filter(p => p.activo !== false).length : '?';
    document.getElementById('stat-estudios').textContent =
      Array.isArray(estudios) ? estudios.length : '?';
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
  }
}

loadStats();
