import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login }          from './login/login';
import { Layout }         from './layout/layout';
import { Lockers }        from './lockers/lockers';
import { Estacionamiento } from './estacionamiento/estacionamiento';

import { MisSolicitudes } from './pages/mis-solicitudes';
import { NuevaSolicitud } from './pages/nueva-solicitud';
import { Solicitudes }    from './pages/solicitudes';
import { Recursos }       from './pages/recursos';
import { Reposiciones }   from './pages/reposiciones';
import { AdminDashboard } from './pages/admin-dashboard';
import { Usuarios }       from './pages/usuarios';
import { PermisosRoles }  from './pages/permisos-roles';
import { Verificacion }   from './pages/verificacion';
import { Notificaciones } from './pages/notificaciones';

const routes: Routes = [
  { path: '',      redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'home',
    component: Layout,
    children: [
      { path: 'mis-solicitudes', component: MisSolicitudes },
      { path: 'nueva-solicitud', component: NuevaSolicitud },
      { path: 'solicitudes',     component: Solicitudes    },
      { path: 'recursos',        component: Recursos       },
      { path: 'reposiciones',    component: Reposiciones   },
      { path: 'dashboard',       component: AdminDashboard },
      { path: 'usuarios',        component: Usuarios       },
      { path: 'permisos-roles',  component: PermisosRoles  },
      { path: 'verificacion',    component: Verificacion   },
      { path: 'notificaciones',  component: Notificaciones },
    ],
  },
  { path: 'lockers',        component: Lockers        },
  { path: 'estacionamiento', component: Estacionamiento },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
