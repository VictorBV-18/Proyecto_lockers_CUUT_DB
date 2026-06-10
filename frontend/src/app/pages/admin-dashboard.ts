import { Component } from '@angular/core';

const PAGE_STYLES = `
  .page-header  { margin-bottom: 1.5rem; }
  .page-title   { font-size: 1.5rem; font-weight: 700; color: #0c3d27; margin: 0 0 0.25rem; }
  .page-desc    { color: #5b625d; font-size: 0.9rem; }
  .stats-grid   { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
  .stat-card    { background: #fff; border-radius: 14px; padding: 1.5rem; text-align: center;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .stat-icon    { font-size: 2rem; margin-bottom: 0.5rem; }
  .stat-value   { font-size: 1.75rem; font-weight: 700; color: #0c3d27; }
  .stat-label   { color: #8a908b; font-size: 0.82rem; margin-top: 0.25rem; }
`;

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-desc">Resumen general del sistema de lockers y estacionamientos.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">—</div>
        <div class="stat-label">Solicitudes activas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">—</div>
        <div class="stat-label">Usuarios registrados</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔒</div>
        <div class="stat-value">—</div>
        <div class="stat-label">Lockers ocupados</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚗</div>
        <div class="stat-value">—</div>
        <div class="stat-label">Cajones ocupados</div>
      </div>
    </div>
  `,
  styles: [PAGE_STYLES],
})
export class AdminDashboard {}
