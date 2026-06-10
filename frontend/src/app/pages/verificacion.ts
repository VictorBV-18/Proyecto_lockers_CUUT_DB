import { Component } from '@angular/core';

const PAGE_STYLES = `
  .page-header { margin-bottom: 1.5rem; }
  .page-title  { font-size: 1.5rem; font-weight: 700; color: #0c3d27; margin: 0 0 0.25rem; }
  .page-desc   { color: #5b625d; font-size: 0.9rem; }
  .empty-card  { background: #fff; border-radius: 14px; padding: 3.5rem 2rem; text-align: center;
                 box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .empty-icon  { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .empty-title { font-weight: 600; color: #1f2a24; margin: 0 0 0.25rem; }
  .empty-text  { color: #8a908b; font-size: 0.9rem; margin: 0; }
`;

@Component({
  selector: 'app-verificacion',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Verificar Accesos</h1>
      <p class="page-desc">Verifica credenciales y valida el acceso a lockers y estacionamiento.</p>
    </div>
    <div class="empty-card">
      <div class="empty-icon">✅</div>
      <p class="empty-title">Sin registros de acceso</p>
      <p class="empty-text">No hay accesos pendientes de verificación.</p>
    </div>
  `,
  styles: [PAGE_STYLES],
})
export class Verificacion {}
