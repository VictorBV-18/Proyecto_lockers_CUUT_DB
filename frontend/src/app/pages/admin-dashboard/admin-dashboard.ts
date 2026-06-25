import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AdminService } from '../../../core/service/admin-service';
import { SolicitudAdmin } from '../../../core/interfaces/admin-interfaces';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit, AfterViewInit {
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;

  // KPIs
  totalSolicitudes = 0;
  tasaAprobacion = 0;
  solicitudesPendientes = 0;
  solicitudesRechazadas = 0;

  // Inventario
  totalLockers = 0;
  lockersDisponibles = 0;
  lockersOcupados = 0;
  lockersMantenimiento = 0;
  porcentajeDisponible = 0;
  alertaBajaDisponibilidad = false;

  // Data para gráficas
  solicitudes: SolicitudAdmin[] = [];
  chartsReady = false;

  private barChart: Chart | null = null;
  private donutChart: Chart | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {
    this.chartsReady = true;
  }

  cargarDatos() {
    this.adminService.obtenerTodasSolicitudes().subscribe({
      next: (res) => {
        this.solicitudes = res.solicitudes;
        this.calcularKPIs();
        setTimeout(() => this.renderizarGraficas(), 100);
      },
      error: (err) => console.error('Error cargando solicitudes:', err),
    });

    this.adminService.obtenerInventarioLockers().subscribe({
      next: (res) => {
        this.totalLockers = res.total_lockers;
        this.lockersDisponibles = res.disponibles;
        this.lockersOcupados = res.ocupados;
        this.lockersMantenimiento = res.mantenimiento;
        this.porcentajeDisponible = res.porcentaje_disponible;
        this.alertaBajaDisponibilidad = res.alerta_baja_disponibilidad;
      },
      error: (err) => console.error('Error cargando inventario:', err),
    });
  }

  calcularKPIs() {
    this.totalSolicitudes = this.solicitudes.length;
    const aprobadas = this.solicitudes.filter((s) => s.estado === 'APROBADA').length;
    const rechazadas = this.solicitudes.filter(
      (s) => s.estado === 'DOCUMENTACION_INCORRECTA' || s.estado === 'RECHAZADA'
    ).length;
    const pendientes = this.solicitudes.filter((s) => s.estado === 'PENDIENTE').length;

    this.tasaAprobacion =
      this.totalSolicitudes > 0
        ? Math.round((aprobadas / this.totalSolicitudes) * 100)
        : 0;
    this.solicitudesPendientes = pendientes;
    this.solicitudesRechazadas = rechazadas;
  }

  renderizarGraficas() {
    if (!this.chartsReady) return;
    this.renderizarBarras();
    this.renderizarDona();
  }

  renderizarBarras() {
    const canvas = this.barChartRef?.nativeElement;
    if (!canvas) return;
    if (this.barChart) this.barChart.destroy();

    // Agrupar por día de la semana
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const aprobadas = new Array(7).fill(0);
    const rechazadas = new Array(7).fill(0);

    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    this.solicitudes.forEach((s) => {
      const fecha = new Date(s.fecha_solicitud);
      if (fecha >= inicioSemana) {
        const dia = fecha.getDay();
        if (s.estado === 'APROBADA') aprobadas[dia]++;
        else if (s.estado === 'DOCUMENTACION_INCORRECTA' || s.estado === 'RECHAZADA')
          rechazadas[dia]++;
      }
    });

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: diasSemana,
        datasets: [
          {
            label: 'Aprobadas',
            data: aprobadas,
            backgroundColor: '#2a9d8f',
            borderRadius: 6,
            barPercentage: 0.6,
          },
          {
            label: 'Rechazadas',
            data: rechazadas,
            backgroundColor: '#d64545',
            borderRadius: 6,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { size: 12 } } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  }

  renderizarDona() {
    const canvas = this.donutChartRef?.nativeElement;
    if (!canvas) return;
    if (this.donutChart) this.donutChart.destroy();

    const aprobadas = this.solicitudes.filter((s) => s.estado === 'APROBADA').length;
    const pendientes = this.solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
    const enRevision = this.solicitudes.filter((s) => s.estado === 'EN_REVISION').length;
    const rechazadas = this.solicitudes.filter(
      (s) => s.estado === 'DOCUMENTACION_INCORRECTA' || s.estado === 'RECHAZADA'
    ).length;

    this.donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Aprobadas', 'Pendientes', 'En Revisión', 'Rechazadas'],
        datasets: [
          {
            data: [aprobadas, pendientes, enRevision, rechazadas],
            backgroundColor: ['#2a9d8f', '#c9a227', '#f4a261', '#d64545'],
            borderWidth: 0,
            spacing: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } },
        },
      },
    });
  }

  get porcentajeOcupacionLockers(): number {
    return this.totalLockers > 0
      ? Math.round((this.lockersOcupados / this.totalLockers) * 100)
      : 0;
  }
}
