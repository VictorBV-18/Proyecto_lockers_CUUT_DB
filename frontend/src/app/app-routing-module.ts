import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Lockers } from './lockers/lockers';
import { Estacionamiento } from './estacionamiento/estacionamiento';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'home', component: Menu },
  { path: 'lockers', component: Lockers },
  { path: 'estacionamiento', component: Estacionamiento },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
