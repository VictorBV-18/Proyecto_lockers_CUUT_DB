import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { EstadisticasDashboardResponse } from '../../../core/interfaces/admin-interfaces';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  estadisticas: EstadisticasDashboardResponse | null = null;
  cargando = true;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.adminService.obtenerEstadisticasDashboard().subscribe({
      next: (res) => {
        this.estadisticas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get tasaAprobacion(): number {
    const s = this.estadisticas?.solicitudes;
    return s && s.total > 0 ? Math.round((s.aprobadas / s.total) * 100) : 0;
  }

  get porcentajeOcupacionLockers(): number {
    const l = this.estadisticas?.lockers;
    return l && l.total > 0 ? Math.round((l.ocupados / l.total) * 100) : 0;
  }

  get porcentajeDisponibleLockers(): number {
    const l = this.estadisticas?.lockers;
    return l && l.total > 0 ? Math.round((l.disponibles / l.total) * 100) : 0;
  }
}
