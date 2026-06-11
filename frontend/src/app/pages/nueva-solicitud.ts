import { Component, OnInit } from '@angular/core';
import {
  SolicitudService,
  SolicitudResumen,
  NuevaSolicitudPayload,
  TipoSolicitudApi,
} from '../../core/service/solicitud-service';

type TipoSolicitud = '' | TipoSolicitudApi;

interface DocumentoRequerido {
  id: string;
  nombre: string;
  formatos: string;
  archivo: File | null;
  error: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FORMATO_DEFAULT = 'Formatos: PDF, JPG, PNG (Máx 5MB)';

const DOCS_ESTACIONAMIENTO: { id: string; nombre: string }[] = [
  { id: 'ine',                  nombre: 'INE (Frente y Vuelta)'  },
  { id: 'tira-materias',        nombre: 'Tira de Materias'       },
  { id: 'credencial',           nombre: 'Credencial Escolar'     },
  { id: 'tarjeta-circulacion',  nombre: 'Tarjeta de Circulación' },
  { id: 'licencia',             nombre: 'Licencia de Conducir'   },
];

const DOCS_LOCKER: { id: string; nombre: string }[] = [
  { id: 'ine',           nombre: 'INE (Frente y Vuelta)' },
  { id: 'tira-materias', nombre: 'Tira de Materias'      },
  { id: 'credencial',    nombre: 'Credencial Escolar'    },
];

const DOC_ICONS: Record<string, string> = {
  ine:                  'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 17.5c.5-2 2-3 3.5-3s3 1 3.5 3M14 9h4M14 12h4M14 15h3',
  'tira-materias':      'M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6l3-3zM8 3v3a2 2 0 0 1-2 2H5M9 13h6M9 9h2M9 17h4',
  credencial:           'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 17c.5-1.5 1.7-2.5 3-2.5s2.5 1 3 2.5M14 9h5M14 12h5M14 15h3',
  'tarjeta-circulacion':'M5 17h-2v-5l2-6h11l4 6v5h-2M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM3 12h18',
  licencia:             'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM7 9h4M7 12h2M14 9h4M14 12h4M14 15h4M3 16h18',
};

const PAGE_STYLES = `
  :host { display: block; max-width: 1240px; }

  /* ── Cabecera ─────────────────────────────────── */
  .breadcrumb { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.4rem; }
  .breadcrumb a { color: var(--text-soft); text-decoration: none; }
  .breadcrumb .crumb-sep { margin: 0 0.4rem; }
  .breadcrumb .crumb-current { color: var(--primary); font-weight: 600; }

  .page-title  { font-size: 1.75rem; font-weight: 700; color: var(--primary-dark); margin: 0 0 0.35rem; letter-spacing: -0.4px; }
  .page-desc   { color: var(--text-soft); font-size: 0.93rem; max-width: 640px; line-height: 1.5; }

  /* ── Layout ───────────────────────────────────── */
  .layout-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  @media (max-width: 1024px) {
    .layout-grid { grid-template-columns: 1fr; }
  }

  /* ── Cards ────────────────────────────────────── */
  .card {
    background: #fff;
    border-radius: 14px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(8, 44, 28, 0.06), 0 4px 12px -6px rgba(8, 44, 28, 0.08);
    border: 1px solid var(--line);
    margin-bottom: 1.25rem;
  }

  .card-label { font-size: 0.78rem; color: var(--text-soft); font-weight: 600; margin-bottom: 0.5rem; }

  /* ── Dropdown ─────────────────────────────────── */
  .select-wrapper { position: relative; }
  .select-field {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding: 0.85rem 2.5rem 0.85rem 1rem;
    background: var(--field-bg);
    border: 1.5px solid var(--field-line);
    border-radius: 10px;
    font-family: var(--font);
    font-size: 0.95rem;
    color: var(--text);
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  }
  .select-field:focus {
    outline: none;
    border-color: var(--primary);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(0, 99, 65, 0.10);
  }
  .select-field.placeholder { color: var(--text-muted); }
  .select-caret {
    position: absolute;
    right: 1rem;
    top: 50%;
    width: 18px;
    height: 18px;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--text-soft);
  }

  /* ── Documentación de Respaldo ────────────────── */
  .docs-card-title {
    display: flex; align-items: center; gap: 0.55rem;
    font-size: 1.02rem; font-weight: 700; color: var(--primary-dark);
    margin-bottom: 0.3rem;
  }
  .docs-card-title svg { width: 20px; height: 20px; }
  .docs-card-sub { color: var(--text-soft); font-size: 0.88rem; margin-bottom: 1.15rem; line-height: 1.45; }

  .doc-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .doc-item {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 0.9rem;
    align-items: center;
    padding: 0.95rem 1rem;
    background: #fafbfa;
    border: 1px solid var(--line);
    border-radius: 11px;
    transition: border-color 0.18s ease, background 0.18s ease;
  }
  .doc-item:hover { border-color: #d3dad6; }
  .doc-item.ready { background: #f1f8f4; border-color: #bfd9c7; }
  .doc-item.has-error { background: #fdf3f3; border-color: #e7c1c1; }

  .doc-icon-wrap {
    width: 44px; height: 44px;
    background: #e8efe9;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    color: var(--primary-dark);
    flex-shrink: 0;
  }
  .doc-item.ready .doc-icon-wrap { background: #d6e9dc; color: var(--primary); }
  .doc-item.has-error .doc-icon-wrap { background: #f5dada; color: var(--tertiary); }
  .doc-icon-wrap svg { width: 22px; height: 22px; }

  .doc-info { min-width: 0; }
  .doc-name { font-weight: 600; color: var(--text); font-size: 0.93rem; }
  .doc-meta { color: var(--text-muted); font-size: 0.78rem; margin-top: 1px; }
  .doc-attached {
    display: inline-flex; align-items: center; gap: 0.35rem;
    margin-top: 0.35rem; padding: 0.18rem 0.5rem;
    background: rgba(0, 99, 65, 0.10);
    color: var(--primary);
    font-size: 0.76rem; font-weight: 600;
    border-radius: 999px;
  }
  .doc-attached svg { width: 13px; height: 13px; }
  .doc-attached .rm {
    margin-left: 0.3rem; cursor: pointer; opacity: 0.7;
    background: none; border: none; color: inherit; padding: 0; font: inherit;
  }
  .doc-attached .rm:hover { opacity: 1; text-decoration: underline; }
  .doc-error {
    margin-top: 0.35rem; color: var(--tertiary); font-size: 0.78rem;
    display: flex; align-items: center; gap: 0.3rem;
  }
  .doc-error svg { width: 13px; height: 13px; flex-shrink: 0; }

  .btn-adjuntar {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.55rem 0.95rem;
    background: #fff;
    border: 1.5px solid var(--line);
    border-radius: 9px;
    font-family: var(--font);
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: all 0.16s ease;
    white-space: nowrap;
  }
  .btn-adjuntar:hover { border-color: var(--primary); color: var(--primary); background: #f6fbf8; }
  .btn-adjuntar svg { width: 14px; height: 14px; }
  .btn-adjuntar.swap { color: var(--primary); border-color: rgba(0, 99, 65, 0.35); background: #f6fbf8; }

  /* ── Estado vacío (sin tipo seleccionado) ─────── */
  .empty-state {
    background: #fff;
    border-radius: 14px;
    padding: 3.5rem 2rem;
    text-align: center;
    border: 1px dashed #d3dad6;
  }
  .empty-state .icon-circle {
    width: 56px; height: 56px;
    margin: 0 auto 0.85rem;
    background: #e8efe9;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--primary);
  }
  .empty-state .icon-circle svg { width: 28px; height: 28px; }
  .empty-state .empty-title { font-weight: 600; color: var(--text); margin-bottom: 0.25rem; }
  .empty-state .empty-text { color: var(--text-muted); font-size: 0.88rem; }

  /* ── Animación de entrada ─────────────────────── */
  .fade-in { animation: fadeSlide 0.32s ease-out both; }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Acciones inferiores ──────────────────────── */
  .actions {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    margin-top: 0.5rem;
  }
  .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.78rem 1.25rem; border-radius: 10px; font-family: var(--font); font-size: 0.92rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.16s ease; }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-secondary { background: #fff; border: 1.5px solid var(--line); color: var(--text); }
  .btn-secondary:hover:not(:disabled) { border-color: var(--text-soft); }
  .btn-primary { background: var(--primary-dark); color: #fff; box-shadow: 0 6px 14px -6px rgba(8, 44, 28, 0.5); }
  .btn-primary:hover:not(:disabled) { background: var(--primary-darker); }
  .btn-primary svg { width: 16px; height: 16px; }

  /* ── Panel lateral derecho ────────────────────── */
  .side-panel { display: flex; flex-direction: column; gap: 1.25rem; }

  .info-card-dark {
    background: var(--primary-dark);
    color: #fff;
    border-radius: 14px;
    padding: 1.25rem;
    position: relative;
    overflow: hidden;
  }
  .info-card-dark::before {
    content: '';
    position: absolute;
    right: -28px; bottom: -28px;
    width: 130px; height: 130px;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .info-card-dark h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
  .info-card-dark h3 svg { width: 18px; height: 18px; }
  .check-list { list-style: none; display: flex; flex-direction: column; gap: 0.7rem; }
  .check-list li { display: flex; gap: 0.55rem; font-size: 0.82rem; line-height: 1.4; color: rgba(255,255,255,0.88); }
  .check-list .check {
    flex-shrink: 0; width: 16px; height: 16px;
    border-radius: 50%; background: var(--secondary);
    display: flex; align-items: center; justify-content: center;
    color: var(--primary-darker);
    margin-top: 1px;
  }
  .check-list .check svg { width: 11px; height: 11px; }

  .info-card-warn {
    background: #fffaf0;
    border: 1px solid #f1d989;
    border-radius: 14px;
    padding: 1.1rem 1.15rem;
  }
  .info-card-warn h4 { font-size: 0.86rem; font-weight: 700; color: #7a5b00; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.45rem; }
  .info-card-warn h4 svg { width: 16px; height: 16px; }
  .info-card-warn p { font-size: 0.82rem; line-height: 1.45; color: #5a4400; }

  .info-card-time {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1.1rem 1.15rem;
  }
  .info-card-time h4 { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.6rem; }
  .time-row { display: flex; justify-content: space-between; align-items: baseline; padding: 0.4rem 0; border-bottom: 1px solid var(--line); font-size: 0.84rem; }
  .time-row:last-child { border-bottom: none; }
  .time-row .label { color: var(--text-soft); }
  .time-row .value { color: var(--text); font-weight: 600; }

  /* ── Historial / Mis Solicitudes ──────────────── */
  .history-section { margin-top: 1.5rem; }
  .history-title { font-size: 1.1rem; font-weight: 700; color: var(--primary-dark); margin-bottom: 0.85rem; }
  .history-list { display: flex; flex-direction: column; gap: 0.65rem; }
  .history-item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.85rem;
    align-items: center;
    padding: 0.9rem 1.1rem;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 11px;
  }
  .history-info { min-width: 0; }
  .history-tipo { font-weight: 600; color: var(--text); font-size: 0.93rem; }
  .history-meta { color: var(--text-muted); font-size: 0.78rem; margin-top: 2px; }
  .history-meta .folio { color: var(--text-soft); font-weight: 500; }

  .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .badge--en_revision { background: #fff5d6; color: #946000; }
  .badge--aprobada    { background: #dff5e6; color: #0a6b3b; }
  .badge--rechazada   { background: #fde0e0; color: #8a3f3d; }
`;

@Component({
  selector: 'app-nueva-solicitud',
  standalone: false,
  template: `
    <div class="breadcrumb">
      <a>Trámites</a>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">Nueva Solicitud</span>
    </div>
    <h1 class="page-title">Generar Nueva Solicitud Académica</h1>
    <p class="page-desc">
      Complete los siguientes campos para iniciar su trámite. Asegúrese de adjuntar la
      documentación necesaria para agilizar el proceso de revisión.
    </p>

    <div class="layout-grid">

      <div>
        <div class="card">
          <div class="card-label">Tipo de Solicitud</div>
          <div class="select-wrapper">
            <select
              class="select-field"
              [class.placeholder]="tipoSolicitud === ''"
              [(ngModel)]="tipoSolicitud"
              (ngModelChange)="onTipoChange()"
              name="tipoSolicitud"
            >
              <option value="" disabled>Seleccione una opción</option>
              <option value="estacionamiento" [disabled]="hayEstacionamientoActiva">
                Gestión de Permiso de Estacionamiento{{ hayEstacionamientoActiva ? ' — ya tienes una en revisión' : '' }}
              </option>
              <option value="locker" [disabled]="hayLockerActivo">
                Gestión para la obtención de locker{{ hayLockerActivo ? ' — ya tienes una en revisión' : '' }}
              </option>
            </select>
            <svg class="select-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>

        <ng-container *ngIf="tipoSolicitud !== ''; else emptyTpl">
          <div class="card fade-in">
            <div class="docs-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              Documentación de Respaldo
            </div>
            <p class="docs-card-sub">
              Por favor, adjunte los siguientes documentos obligatorios para
              {{ tipoSolicitud === 'estacionamiento' ? 'el Permiso de Estacionamiento' : 'la obtención de Locker' }}:
            </p>

            <div class="doc-list">
              <div
                *ngFor="let doc of documentos; let i = index"
                class="doc-item"
                [class.ready]="doc.archivo"
                [class.has-error]="doc.error"
              >
                <div class="doc-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="getDocIcon(doc.id)"></path>
                  </svg>
                </div>
                <div class="doc-info">
                  <div class="doc-name">{{ doc.nombre }}</div>
                  <div class="doc-meta">{{ doc.formatos }}</div>

                  <div class="doc-attached" *ngIf="doc.archivo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    {{ doc.archivo.name }} · {{ formatBytes(doc.archivo.size) }}
                    <button class="rm" type="button" (click)="removeFile(i)">quitar</button>
                  </div>

                  <div class="doc-error" *ngIf="doc.error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {{ doc.error }}
                  </div>
                </div>

                <label class="btn-adjuntar" [class.swap]="doc.archivo">
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    (change)="onFileSelected($event, i)"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  {{ doc.archivo ? 'Reemplazar' : 'Adjuntar archivo' }}
                </label>
              </div>
            </div>
          </div>

          <div class="actions fade-in">
            <button class="btn btn-secondary" type="button" (click)="guardarBorrador()">
              Guardar Borrador
            </button>
            <button
              class="btn btn-primary"
              type="button"
              [disabled]="!todosDocumentosListos() || enviando"
              (click)="enviarSolicitud()"
            >
              {{ enviando ? 'Enviando...' : 'Enviar Solicitud' }}
              <svg *ngIf="!enviando" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
        </ng-container>

        <ng-template #emptyTpl>
          <div class="empty-state fade-in">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6M12 12v6M9 15h6"/>
              </svg>
            </div>
            <p class="empty-title">Selecciona un tipo de trámite</p>
            <p class="empty-text">
              Elige una opción del selector superior para ver los documentos requeridos.
            </p>
          </div>
        </ng-template>
      </div>

      <aside class="side-panel">
        <div class="info-card-dark">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Guía de Seguridad
          </h3>
          <ul class="check-list">
            <li>
              <span class="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </span>
              Verifique que sus datos personales estén actualizados antes de enviar.
            </li>
            <li>
              <span class="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </span>
              Los documentos PDF deben estar sin protección por contraseña.
            </li>
            <li>
              <span class="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </span>
              Cada archivo no debe exceder los 5MB de tamaño.
            </li>
          </ul>
        </div>

        <div class="info-card-warn" title="No se permiten dos solicitudes activas del mismo tipo">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Notas Importantes
          </h4>
          <p>
            No se permiten <strong>dos solicitudes activas del mismo tipo</strong>. Si ya tienes
            una solicitud en revisión, deberás esperar la resolución antes de generar otra.
          </p>
        </div>

        <div class="info-card-time">
          <h4>Tiempos de Respuesta</h4>
          <div class="time-row">
            <span class="label">Revisión Inicial</span>
            <span class="value">24 hrs</span>
          </div>
          <div class="time-row">
            <span class="label">Trámite Ordinario</span>
            <span class="value">3–5 días hábiles</span>
          </div>
          <div class="time-row">
            <span class="label">Urgencias</span>
            <span class="value">Previa validación</span>
          </div>
        </div>
      </aside>

    </div>

    <section class="history-section">
      <h2 class="history-title">Mis Solicitudes Recientes</h2>
      <div class="history-list">
        <div *ngFor="let s of historial" class="history-item">
          <div class="history-info">
            <div class="history-tipo">{{ s.tipo }}</div>
            <div class="history-meta">
              <span class="folio">{{ s.folio }}</span> · {{ s.fecha }}
            </div>
          </div>
          <span class="badge" [ngClass]="'badge--' + s.estado">
            <span class="badge-dot"></span>
            {{ getEstadoLabel(s.estado) }}
          </span>
        </div>
      </div>
    </section>
  `,
  styles: [PAGE_STYLES],
})
export class NuevaSolicitud implements OnInit {
  tipoSolicitud: TipoSolicitud = '';
  documentos: DocumentoRequerido[] = [];
  historial: SolicitudResumen[] = [];
  enviando = false;

  constructor(private solicitudService: SolicitudService) {}

  ngOnInit(): void {
    const numeroCuenta = localStorage.getItem('cuentaUsuario') || '';
    this.solicitudService.listarMisSolicitudes(numeroCuenta).subscribe({
      next: (lista) => { this.historial = lista; },
      error: ()     => { this.historial = []; },
    });
  }

  get hayEstacionamientoActiva(): boolean {
    return this.historial.some(
      s => s.tipo === 'Permiso de Estacionamiento' && s.estado === 'en_revision',
    );
  }

  get hayLockerActivo(): boolean {
    return this.historial.some(
      s => s.tipo === 'Obtención de Locker' && s.estado === 'en_revision',
    );
  }

  onTipoChange(): void {
    const fuente =
      this.tipoSolicitud === 'estacionamiento' ? DOCS_ESTACIONAMIENTO
      : this.tipoSolicitud === 'locker'        ? DOCS_LOCKER
      :                                          [];

    this.documentos = fuente.map(d => ({
      id:       d.id,
      nombre:   d.nombre,
      formatos: FORMATO_DEFAULT,
      archivo:  null,
      error:    null,
    }));
  }

  onFileSelected(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files && input.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      this.documentos[idx].archivo = null;
      this.documentos[idx].error   = `Archivo demasiado grande (${sizeMb} MB). Máximo permitido: 5 MB.`;
    } else {
      this.documentos[idx].archivo = file;
      this.documentos[idx].error   = null;
    }
    input.value = '';
  }

  removeFile(idx: number): void {
    this.documentos[idx].archivo = null;
    this.documentos[idx].error   = null;
  }

  todosDocumentosListos(): boolean {
    return this.documentos.length > 0 && this.documentos.every(d => d.archivo !== null);
  }

  guardarBorrador(): void {
    if (this.tipoSolicitud === '') {
      alert('Selecciona primero un tipo de solicitud.');
      return;
    }
    const payload = this.construirPayload();
    this.solicitudService.guardarBorrador(payload).subscribe({
      next:  () => alert('Borrador guardado.'),
      error: () => alert('No se pudo guardar el borrador.'),
    });
  }

  enviarSolicitud(): void {
    if (!this.todosDocumentosListos() || this.enviando) {
      if (!this.todosDocumentosListos()) {
        alert('Debes adjuntar todos los documentos obligatorios.');
      }
      return;
    }

    const tipoLabel = this.tipoSolicitud === 'estacionamiento'
      ? 'Permiso de Estacionamiento'
      : 'Obtención de Locker';

    this.enviando = true;
    const payload = this.construirPayload();

    this.solicitudService.crearSolicitud(payload).subscribe({
      next: (res) => {
        this.historial = [
          {
            id:     String(Date.now()),
            tipo:   tipoLabel,
            folio:  res.folio,
            fecha:  new Date().toLocaleDateString('es-MX'),
            estado: 'en_revision',
          },
          ...this.historial,
        ];
        alert(`Solicitud enviada.\nFolio: ${res.folio}\nQuedará en revisión.`);
        this.tipoSolicitud = '';
        this.documentos    = [];
        this.enviando      = false;
      },
      error: () => {
        alert('No se pudo enviar la solicitud. Intenta más tarde.');
        this.enviando = false;
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024)              return `${bytes} B`;
    if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`;
    return                            `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  getEstadoLabel(estado: SolicitudResumen['estado']): string {
    const labels: Record<SolicitudResumen['estado'], string> = {
      en_revision: 'En revisión',
      aprobada:    'Aprobada',
      rechazada:   'Rechazada',
    };
    return labels[estado];
  }

  getDocIcon(id: string): string {
    return DOC_ICONS[id] || DOC_ICONS['ine'];
  }

  private construirPayload(): NuevaSolicitudPayload {
    return {
      numeroCuenta: localStorage.getItem('cuentaUsuario') || '',
      tipo:         (this.tipoSolicitud || 'locker') as TipoSolicitudApi,
      documentos:   this.documentos
        .filter(d => d.archivo !== null)
        .map(d => ({
          id:            d.id,
          nombre:        d.nombre,
          archivoNombre: d.archivo!.name,
          archivoTamano: d.archivo!.size,
        })),
    };
  }
}
