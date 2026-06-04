import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-estacionamiento',
  standalone: false,
  templateUrl: './estacionamiento.html',
  styleUrl: './estacionamiento.css',
})
export class Estacionamiento {
  constructor(private router: Router) {}

  regresar() {
    this.router.navigate(['/menu']);
  }
}
