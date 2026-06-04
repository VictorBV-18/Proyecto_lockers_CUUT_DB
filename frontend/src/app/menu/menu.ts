import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    if (!localStorage.getItem('cuentaUsuario')) {
      alert('Por favor inicia sesion primero');
      this.router.navigate(['/login']);
    }
  }

  irALockers() {
    this.router.navigate(['/lockers']);
  }

  irAEstacionamiento() {
    this.router.navigate(['/estacionamiento']);
  }
}
