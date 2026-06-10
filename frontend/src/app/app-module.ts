import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App }              from './app';
import { Login }            from './login/login';
import { Menu }             from './menu/menu';
import { Lockers }          from './lockers/lockers';
import { Estacionamiento }  from './estacionamiento/estacionamiento';

import { Layout }           from './layout/layout';
import { MisSolicitudes }   from './pages/mis-solicitudes';
import { NuevaSolicitud }   from './pages/nueva-solicitud';
import { Solicitudes }      from './pages/solicitudes';
import { Recursos }         from './pages/recursos';
import { Reposiciones }     from './pages/reposiciones';
import { AdminDashboard }   from './pages/admin-dashboard';
import { Usuarios }         from './pages/usuarios';
import { PermisosRoles }    from './pages/permisos-roles';
import { Verificacion }     from './pages/verificacion';
import { Notificaciones }   from './pages/notificaciones';

@NgModule({
  declarations: [
    App,
    Login,
    Menu,
    Lockers,
    Estacionamiento,
    Layout,
    MisSolicitudes,
    NuevaSolicitud,
    Solicitudes,
    Recursos,
    Reposiciones,
    AdminDashboard,
    Usuarios,
    PermisosRoles,
    Verificacion,
    Notificaciones,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
  ],
  bootstrap: [App],
})
export class AppModule {}
