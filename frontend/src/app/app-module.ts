import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App }              from './app';
import { Login }            from './pages/login/login';
import { Menu }             from './menu/menu';
import { Lockers }          from './lockers/lockers';
import { Estacionamiento }  from './estacionamiento/estacionamiento';

import { Layout }           from './layout/layout';
import { MisSolicitudes }   from './pages/mis-solicitudes/mis-solicitudes';
import { NuevaSolicitud }   from './pages/nueva-solicitud/nueva-solicitud';
import { Solicitudes }      from './pages/solicitudes/solicitudes';
import { Recursos }         from './pages/recursos/recursos';
import { Reposiciones }     from './pages/reposiciones/reposiciones';
import { AdminDashboard }   from './pages/admin-dashboard/admin-dashboard';
import { Usuarios }         from './pages/usuarios/usuarios';
import { PermisosRoles }    from './pages/permisos-roles/permisos-roles';
import { Verificacion }     from './pages/verificacion/verificacion';
import { Notificaciones }   from './pages/notificaciones/notificaciones';
import { AdminConfiguracion } from './pages/admin-configuracion/admin-configuracion';
import { Auditoria }          from './pages/auditoria/auditoria';

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
    AdminConfiguracion,
    Auditoria,
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
