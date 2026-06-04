import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lockers',
  standalone: false,
  templateUrl: './lockers.html',
  styleUrl: './lockers.css',
})
export class Lockers {
  constructor(private router: Router) {}

  regresar() {
    this.router.navigate(['/menu']);
  }
}
