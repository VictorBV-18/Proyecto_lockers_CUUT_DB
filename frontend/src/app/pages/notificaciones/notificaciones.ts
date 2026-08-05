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

  constructor(
    private notificacionService: NotificacionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.cargando = true;
    this.notificacionService.notificaciones(this.numeroCuenta, this.rolUsuario).subscribe({
      next: (response) => {
        this.notificaciones = response.notificaciones;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) return;
    this.notificacionService.notificacionLeida(notificacion.id_notificacion).subscribe({
      next: () => {
        notificacion.leida = true;
        this.cdr.detectChanges();
      },
      error: () => {},
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
