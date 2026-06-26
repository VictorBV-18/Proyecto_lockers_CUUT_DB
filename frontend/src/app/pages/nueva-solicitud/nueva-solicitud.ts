import { Component } from '@angular/core';
import {
  SolicitudResumen,
  NuevaSolicitudPayload,
  TipoSolicitudApi,
  DocumentoRequerido,
} from '../../../core/interfaces/interfaces';
import { SolicitudService } from '../../../core/service/solicitud-service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

const ESTADOS_ACTIVOS = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'DATOS_INCOMPLETOS'];

type TipoSolicitud = '' | TipoSolicitudApi;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FORMATO_DEFAULT = 'Formatos: PDF, JPG, PNG (Máx 5MB)';

const DOCS_ESTACIONAMIENTO: { id: string; nombre: string; idTipoDocumento: number }[] = [
  { id: 'credencial', nombre: 'Credencial Escolar', idTipoDocumento: 1 },
  { id: 'tira-materias', nombre: 'Tira de Materias', idTipoDocumento: 2 },
  { id: 'tarjeta-circulacion', nombre: 'Tarjeta de Circulación', idTipoDocumento: 3 },
  { id: 'licencia', nombre: 'Licencia de Conducir', idTipoDocumento: 4 },
];

const DOCS_LOCKER: { id: string; nombre: string; idTipoDocumento: number }[] = [
  { id: 'credencial', nombre: 'Credencial Escolar', idTipoDocumento: 1 },
  { id: 'tira-materias', nombre: 'Tira de Materias', idTipoDocumento: 2 },
];

const DOC_ICONS: Record<string, string> = {
  ine: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 17.5c.5-2 2-3 3.5-3s3 1 3.5 3M14 9h4M14 12h4M14 15h3',
  'tira-materias':
    'M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6l3-3zM8 3v3a2 2 0 0 1-2 2H5M9 13h6M9 9h2M9 17h4',
  credencial:
    'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 17c.5-1.5 1.7-2.5 3-2.5s2.5 1 3 2.5M14 9h5M14 12h5M14 15h3',
  'tarjeta-circulacion':
    'M5 17h-2v-5l2-6h11l4 6v5h-2M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM3 12h18',
  licencia:
    'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM7 9h4M7 12h2M14 9h4M14 12h4M14 15h4M3 16h18',
};

@Component({
  selector: 'app-nueva-solicitud',
  standalone: false,
  templateUrl: './nueva-solicitud.html',
  styleUrl: './nueva-solicitud.css',
})
export class NuevaSolicitud {
  tipoSolicitud: TipoSolicitud = '';
  documentos: DocumentoRequerido[] = [];
  enviando = false;
  idSolicitudActual: number | null = null;
  numeroCuenta = localStorage.getItem('numeroCuenta') || '';

  constructor(
    private solicitudService: SolicitudService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.solicitudService.listarMisSolicitudes(this.numeroCuenta).subscribe();
  }

  get hayEstacionamientoActiva(): boolean {
    return this.solicitudService
      .misTramites()
      .some((s) => s.tipo_tramite === 'estacionamiento' && ESTADOS_ACTIVOS.includes(s.estado_solicitud));
  }

  get hayLockerActivo(): boolean {
    return this.solicitudService
      .misTramites()
      .some((s) => s.tipo_tramite === 'locker' && ESTADOS_ACTIVOS.includes(s.estado_solicitud));
  }

  onTipoChange(): void {
    this.documentos = [];
    this.idSolicitudActual = null;

    if (this.tipoSolicitud === '') {
      return;
    }

    const tipoSeleccionado = this.tipoSolicitud;

    Swal.fire({
      title: `¿Estás seguro que quieres iniciar una solicitud de ${tipoSeleccionado}?`,
      text: 'Debes adjuntar todos los documentos obligatorios.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.solicitudService.crearSolicitud(this.construirPayload(tipoSeleccionado)).subscribe({
          next: (response) => {
            this.idSolicitudActual = response.id_solicitud;
            this.documentos = this.construirDocumentos(tipoSeleccionado);
          },
          error: () => {
            this.tipoSolicitud = '';
          },
        });
      } else {
        this.tipoSolicitud = '';
      }
    });
  }

  onFileSelected(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      this.documentos[idx].archivo = null;
      this.documentos[idx].error =
        `Archivo demasiado grande (${sizeMb} MB). Máximo permitido: 5 MB.`;
    } else {
      this.documentos[idx].archivo = file;
      this.documentos[idx].error = null;
    }
    input.value = '';
  }

  removeFile(idx: number): void {
    this.documentos[idx].archivo = null;
    this.documentos[idx].error = null;
  }

  todosDocumentosListos(): boolean {
    return this.documentos.length > 0 && this.documentos.every((d) => d.archivo !== null);
  }

  guardarBorrador(): void {
    if (this.tipoSolicitud === '') {
      alert('Selecciona primero un tipo de solicitud.');
      return;
    }
    const payload = this.construirPayload(this.tipoSolicitud);
    this.solicitudService.guardarBorrador(payload).subscribe({
      next: () => alert('Borrador guardado.'),
      error: () => alert('No se pudo guardar el borrador.'),
    });
  }

  enviarSolicitud(): void {
    if (!this.todosDocumentosListos() || this.enviando || this.idSolicitudActual === null) {
      if (!this.todosDocumentosListos()) {
        alert('Debes adjuntar todos los documentos obligatorios.');
      }
      return;
    }

    this.enviando = true;
    const idSolicitud = this.idSolicitudActual;
    const subidas = this.documentos.map((doc) =>
      this.solicitudService.subirDocumento(idSolicitud, doc.idTipoDocumento, doc.archivo!),
    );

    forkJoin(subidas).subscribe({
      next: () => {
        this.solicitudService.finalizarSolicitud(idSolicitud).subscribe({
          next: () => {
            this.enviando = false;
            this.solicitudService.peticionSuccess('Solicitud enviada con éxito.');
            this.router.navigate(['/home/mis-solicitudes']);
          },
          error: () => {
            this.enviando = false;
          },
        });
      },
      error: () => {
        this.enviando = false;
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  getEstadoLabel(estado: SolicitudResumen['estado']): string {
    const labels: Record<SolicitudResumen['estado'], string> = {
      en_revision: 'En revisión',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      pendiente: 'Pendiente',
    };
    return labels[estado];
  }

  getDocIcon(id: string): string {
    return DOC_ICONS[id] || DOC_ICONS['ine'];
  }

  private construirPayload(tipo: TipoSolicitudApi): NuevaSolicitudPayload {
    return {
      numero_cuenta: localStorage.getItem('numeroCuenta') || '',
      tipo_tramite: tipo,
      observacion: '',
      correo_electronico: 'pepito@pepito.com',
    };
  }

  private construirDocumentos(tipo: TipoSolicitudApi): DocumentoRequerido[] {
    const fuente = tipo === 'estacionamiento' ? DOCS_ESTACIONAMIENTO : DOCS_LOCKER;
    return fuente.map((d) => ({
      id: d.id,
      idTipoDocumento: d.idTipoDocumento,
      nombre: d.nombre,
      formatos: FORMATO_DEFAULT,
      archivo: null,
      error: null,
    }));
  }
}
