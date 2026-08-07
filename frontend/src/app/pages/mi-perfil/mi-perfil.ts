import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SolicitudService } from '../../../core/service/solicitud-service';
import { RecursoActivo } from '../../../core/interfaces/interfaces';

@Component({
  selector: 'app-mi-perfil',
  standalone: false,
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil implements OnInit {
  numeroCuenta = localStorage.getItem('numeroCuenta') || '';

  vehiculo: RecursoActivo | null = null;
  cargandoVehiculo = true;

  contrasenaActual = '';
  contrasenaNueva = '';
  confirmarContrasena = '';
  guardandoContrasena = false;

  constructor(
    private solicitudService: SolicitudService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarVehiculo();
  }

  private cargarVehiculo(): void {
    this.solicitudService.obtenerDetallesTramite(this.numeroCuenta).subscribe({
      next: (response) => {
        this.vehiculo =
          response.recursos_activos.find((r) => r.tipo_tramite === 'estacionamiento') ?? null;
        this.cargandoVehiculo = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoVehiculo = false;
        this.cdr.detectChanges();
      },
    });
  }

  cambiarContrasena(): void {
    if (!this.contrasenaActual || !this.contrasenaNueva || !this.confirmarContrasena) {
      this.solicitudService.peticionError('Completa todos los campos.');
      return;
    }
    if (this.contrasenaNueva !== this.confirmarContrasena) {
      this.solicitudService.peticionError('Las contraseñas nuevas no coinciden.');
      return;
    }

    this.guardandoContrasena = true;
    this.solicitudService
      .cambiarContrasena(this.numeroCuenta, {
        contrasena_actual: this.contrasenaActual,
        contrasena_nueva: this.contrasenaNueva,
      })
      .subscribe({
        next: (response) => {
          this.solicitudService.peticionSuccess(response.mensaje);
          this.contrasenaActual = '';
          this.contrasenaNueva = '';
          this.confirmarContrasena = '';
          this.guardandoContrasena = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardandoContrasena = false;
          this.cdr.detectChanges();
        },
      });
  }
}
