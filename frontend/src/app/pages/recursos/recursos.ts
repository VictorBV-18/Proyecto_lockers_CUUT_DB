import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { LockerItem } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-recursos',
  standalone: false,
  templateUrl: './recursos.html',
  styleUrl: './recursos.css',
})
export class Recursos implements OnInit {
  // Resumen
  totalLockers = 0;
  disponibles = 0;
  ocupados = 0;
  mantenimiento = 0;

  // Tabla
  lockers: LockerItem[] = [];

  // Modal Nuevo / Editar
  mostrarModalLocker = false;
  modoEdicion = false;
  lockerForm = { id_locker: 0, codigo_locker: '', ubicacion: '', estado: 'DISPONIBLE' };

  // Modal Baja / Mantenimiento
  mostrarModalBaja = false;
  lockerBaja: LockerItem | null = null;
  motivoBaja = '';
  errorMotivoBaja = false;
  accionBaja = '';

  // Modal Liberación Masiva
  mostrarModalLiberacion = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.adminService.obtenerInventarioLockers().subscribe({
      next: (res) => {
        this.totalLockers = res.total_lockers;
        this.disponibles = res.disponibles;
        this.ocupados = res.ocupados;
        this.mantenimiento = res.mantenimiento;
      },
    });
    this.adminService.listarTodosLockers().subscribe({
      next: (res) => {
        this.lockers = res.lockers;
      },
    });
  }

  getEstadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      DISPONIBLE: 'badge--success',
      OCUPADO: 'badge--warning',
      MANTENIMIENTO: 'badge--muted',
    };
    return mapa[estado] || 'badge--muted';
  }

  // ── Modal Nuevo / Editar ──────────────────
  abrirModalNuevo() {
    this.modoEdicion = false;
    this.lockerForm = { id_locker: 0, codigo_locker: '', ubicacion: '', estado: 'DISPONIBLE' };
    this.mostrarModalLocker = true;
  }

  abrirModalEditar(locker: LockerItem) {
    this.modoEdicion = true;
    this.lockerForm = { ...locker };
    this.mostrarModalLocker = true;
  }

  cerrarModalLocker() {
    this.mostrarModalLocker = false;
  }

  guardarLocker() {
    if (!this.lockerForm.codigo_locker.trim() || !this.lockerForm.ubicacion.trim()) return;

    if (this.modoEdicion) {
      this.adminService
        .actualizarLocker(this.lockerForm.id_locker, {
          codigo_locker: this.lockerForm.codigo_locker,
          ubicacion: this.lockerForm.ubicacion,
          estado: this.lockerForm.estado,
        })
        .subscribe({
          next: () => {
            this.cerrarModalLocker();
            this.cargarDatos();
          },
          error: (err) => console.error('Error actualizando locker:', err),
        });
    } else {
      this.adminService
        .crearLocker({
          codigo_locker: this.lockerForm.codigo_locker,
          ubicacion: this.lockerForm.ubicacion,
          estado: this.lockerForm.estado,
        })
        .subscribe({
          next: () => {
            this.cerrarModalLocker();
            this.cargarDatos();
          },
          error: (err) => console.error('Error creando locker:', err),
        });
    }
  }

  // ── Modal Baja / Mantenimiento ────────────
  abrirModalBaja(locker: LockerItem, accion: string) {
    this.lockerBaja = locker;
    this.accionBaja = accion;
    this.motivoBaja = '';
    this.errorMotivoBaja = false;
    this.mostrarModalBaja = true;
  }

  cerrarModalBaja() {
    this.mostrarModalBaja = false;
    this.lockerBaja = null;
    this.motivoBaja = '';
  }

  confirmarBaja() {
    if (!this.motivoBaja.trim()) {
      this.errorMotivoBaja = true;
      return;
    }
    this.errorMotivoBaja = false;

    if (this.lockerBaja) {
      this.adminService
        .darBajaLocker(this.lockerBaja.id_locker, {
          id_admin: 1,
          motivo: this.motivoBaja,
        })
        .subscribe({
          next: () => {
            this.cerrarModalBaja();
            this.cargarDatos();
          },
          error: (err) => console.error('Error dando de baja:', err),
        });
    }
  }

  // ── Modal Liberación Masiva ───────────────
  abrirModalLiberacion() {
    this.mostrarModalLiberacion = true;
  }

  cerrarModalLiberacion() {
    this.mostrarModalLiberacion = false;
  }
}
