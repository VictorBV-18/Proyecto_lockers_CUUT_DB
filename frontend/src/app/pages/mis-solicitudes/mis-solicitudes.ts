import { Component, inject } from '@angular/core';
import { SolicitudService } from '../../../core/service/solicitud-service';
import { SolicitudResumen } from '../../../core/interfaces/interfaces';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: false,
  templateUrl: './mis-solicitudes.html',
  styleUrl: './mis-solicitudes.css',
})
export class MisSolicitudes {

  solicitudesUsuario = inject(SolicitudService);
  numeroCuenta = localStorage.getItem("numeroCuenta") || '';

  ngOnInit(){
    this.getSolicitudes();
  }

  getSolicitudes(){
    console.log(this.solicitudesUsuario.misSolicitudes());
    this.solicitudesUsuario.listarMisSolicitudes(this.numeroCuenta).subscribe();
  }

}
