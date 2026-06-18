import { Component } from '@angular/core';
import {
  SolicitudResumen,
  NuevaSolicitudPayload,
  TipoSolicitudApi,
  DocumentoRequerido,
} from '../../../core/interfaces/interfaces';
import { SolicitudService } from '../../../core/service/solicitud-service';

type TipoSolicitud = '' | TipoSolicitudApi;



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

@Component({
  selector: 'app-nueva-solicitud',
  standalone: false,
  templateUrl: './nueva-solicitud.html',
  styleUrl:    './nueva-solicitud.css',
})
export class NuevaSolicitud {
  tipoSolicitud: TipoSolicitud = '';
  documentos: DocumentoRequerido[] = [];
  historial: SolicitudResumen[] = [];
  enviando = false;

  constructor(private solicitudService: SolicitudService) {}

 
  

  get hayEstacionamientoActiva(): boolean {
    return this.historial.some(
      s => s.tipo_tramite === 'Permiso de Estacionamiento' && s.estado === 'en_revision',
    );
  }

  get hayLockerActivo(): boolean {
    return this.historial.some(
      s => s.tipo_tramite === 'Obtención de Locker' && s.estado === 'en_revision',
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
            id_solicitud:     String(Date.now()),
            tipo_tramite:   tipoLabel,
            folio:  res.folio,
            fecha_solicitud:  new Date().toLocaleDateString('es-MX'),
            estado: 'en_revision',
            observacion_alumno: '',
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
      pendiente:   'Pendiente',
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
      
      /* 
      documentos:   this.documentos
        .filter(d => d.archivo !== null)
        .map(d => ({
          id:            d.id,
          nombre:        d.nombre,
          archivoNombre: d.archivo!.name,
          archivoTamano: d.archivo!.size,
        })),
        */
    };
  }
}
