import { Component, OnInit } from '@angular/core';
import { RequisitoMock } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-admin-configuracion',
  standalone: false,
  templateUrl: './admin-configuracion.html',
  styleUrl: './admin-configuracion.css',
})
export class AdminConfiguracion implements OnInit {
  // Convocatoria
  fechaInicio = '';
  fechaCierre = '';

  // Requisitos
  requisitos: RequisitoMock[] = [];
  nuevoRequisitoNombre = '';
  nuevoRequisitoTramite = 'ambos';

  ngOnInit() {
    this.fechaInicio = '2026-01-15';
    this.fechaCierre = '2026-07-31';

    this.requisitos = [
      { id: 1, nombre: 'Credencial UAEMex', obligatorio: true, tramiteAsociado: 'ambos' },
      { id: 2, nombre: 'Tira de materias', obligatorio: true, tramiteAsociado: 'ambos' },
      { id: 3, nombre: 'Tarjeta de Circulación', obligatorio: true, tramiteAsociado: 'estacionamiento' },
      { id: 4, nombre: 'Licencia de Conducir', obligatorio: true, tramiteAsociado: 'estacionamiento' },
    ];
  }

  toggleObligatorio(requisito: RequisitoMock) {
    requisito.obligatorio = !requisito.obligatorio;
  }

  eliminarRequisito(id: number) {
    this.requisitos = this.requisitos.filter((r) => r.id !== id);
  }

  agregarRequisito() {
    if (!this.nuevoRequisitoNombre.trim()) return;
    const nuevoId = Math.max(...this.requisitos.map((r) => r.id), 0) + 1;
    this.requisitos.push({
      id: nuevoId,
      nombre: this.nuevoRequisitoNombre,
      obligatorio: true,
      tramiteAsociado: this.nuevoRequisitoTramite,
    });
    this.nuevoRequisitoNombre = '';
    this.nuevoRequisitoTramite = 'ambos';
  }

  getTramiteTexto(tramite: string): string {
    const mapa: Record<string, string> = {
      ambos: 'Ambos',
      locker: 'Locker',
      estacionamiento: 'Estacionamiento',
    };
    return mapa[tramite] || tramite;
  }
}
