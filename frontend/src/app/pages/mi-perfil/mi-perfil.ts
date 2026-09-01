import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SolicitudService } from '../../../core/service/solicitud-service';
import { PerfilAlumnoResponse } from '../../../core/interfaces/interfaces';

@Component({
  selector: 'app-mi-perfil',
  standalone: false,
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil implements OnInit {
  numeroCuenta = localStorage.getItem('numeroCuenta') || '';

  perfil: PerfilAlumnoResponse | null = null;
  cargandoPerfil = true;

  contrasenaActual = '';
  contrasenaNueva = '';
  confirmarContrasena = '';
  guardandoContrasena = false;

  constructor(
    private solicitudService: SolicitudService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  private cargarPerfil(): void {
    this.solicitudService.obtenerPerfilAlumno(this.numeroCuenta).subscribe({
      next: (response) => {
        this.perfil = response;
        this.cargandoPerfil = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoPerfil = false;
        this.cdr.detectChanges();
      },
    });
  }

  cambiarContrasena(): void {
    if (
      !this.contrasenaActual.trim() ||
      !this.contrasenaNueva.trim() ||
      !this.confirmarContrasena.trim()
    ) {
      this.solicitudService.peticionError('Completa todos los campos.');
      return;
    }
    if (this.contrasenaNueva.length < 8) {
      this.solicitudService.peticionError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.contrasenaNueva !== this.confirmarContrasena) {
      this.solicitudService.peticionError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (this.contrasenaNueva === this.contrasenaActual) {
      this.solicitudService.peticionError('La nueva contraseña debe ser diferente a la actual.');
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
