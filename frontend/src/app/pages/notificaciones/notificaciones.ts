import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NotificacionService } from '../../../core/service/notificacion-service';
import { Notificacion } from '../../../core/interfaces/interfaces';

@Component({
  selector: 'app-notificaciones',
  standalone: false,
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css',
})
export class Notificaciones implements OnInit {
  numeroCuenta = localStorage.getItem('numeroCuenta') || '';
  rolUsuario = localStorage.getItem('rolUsuario') || 'alumno';

  notificaciones: Notificacion[] = [];
  cargando = false;
  cargandoMas = false;
  marcandoTodas = false;
  paginaActual = 1;
  totalPaginas = 1;

  constructor(
    public notificacionService: NotificacionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones(1);
  }

  get hayMasNotificaciones(): boolean {
    return this.paginaActual < this.totalPaginas;
  }

  cargarNotificaciones(page: number): void {
    this.cargando = page === 1;
    this.cargandoMas = page > 1;
    this.notificacionService.notificaciones(this.numeroCuenta, this.rolUsuario, page).subscribe({
      next: (response) => {
        this.notificaciones =
          page === 1 ? response.resultados : [...this.notificaciones, ...response.resultados];
        this.paginaActual = response.pagina_actual;
        this.totalPaginas = response.total_paginas;
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarMas(): void {
    if (this.hayMasNotificaciones && !this.cargandoMas) {
      this.cargarNotificaciones(this.paginaActual + 1);
    }
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) return;
    this.notificacionService.notificacionLeida(notificacion.id_notificacion, this.numeroCuenta).subscribe({
      next: () => {
        notificacion.leida = true;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  marcarTodasLeidas(): void {
    if (this.marcandoTodas) return;
    this.marcandoTodas = true;
    this.notificacionService.marcarTodasLeidas(this.numeroCuenta, this.rolUsuario).subscribe({
      next: () => {
        this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
        this.marcandoTodas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.marcandoTodas = false;
        this.cdr.detectChanges();
      },
    });
  }

  getFechaFormateada(fecha: string): string {
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return fecha;
    const hora = f.getHours().toString().padStart(2, '0');
    const min = f.getMinutes().toString().padStart(2, '0');
    return `${f.getDate()} ${meses[f.getMonth()]}, ${hora}:${min}`;
  }
}
