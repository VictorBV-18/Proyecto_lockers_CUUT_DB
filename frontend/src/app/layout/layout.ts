import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

const ROLE_MENUS: Record<string, MenuItem[]> = {
  alumno: [
    { label: 'Mis Solicitudes',   route: '/home/mis-solicitudes', icon: 'list'          },
    { label: 'Nueva Solicitud',   route: '/home/nueva-solicitud', icon: 'plus'          },
  ],
  personal: [
    { label: 'Solicitudes',       route: '/home/solicitudes',     icon: 'inbox'         },
    { label: 'Recursos',          route: '/home/recursos',        icon: 'package'       },
    { label: 'Reposiciones',      route: '/home/reposiciones',    icon: 'refresh'       },
  ],
  administrador: [
    { label: 'Dashboard',         route: '/home/dashboard',       icon: 'chart'         },
    { label: 'Solicitudes',       route: '/home/solicitudes',     icon: 'inbox'         },
    { label: 'Inventario',        route: '/home/recursos',        icon: 'package'       },
    { label: 'Usuarios',          route: '/home/usuarios',        icon: 'users'         },
    { label: 'Permisos y Roles',  route: '/home/permisos-roles',  icon: 'shield'        },
    { label: 'Configuración',     route: '/home/configuracion',   icon: 'settings'      },
    { label: 'Auditoría',         route: '/home/auditoria',       icon: 'clipboard'     },
  ],
  guardia: [
    { label: 'Verificar Accesos', route: '/home/verificacion',    icon: 'check-circle'  },
  ],
};

// Alias: el backend devuelve 'admin' pero el mapa usa 'administrador'
ROLE_MENUS['admin'] = ROLE_MENUS['administrador'];

const ROLE_LABELS: Record<string, string> = {
  alumno:        'Alumno',
  personal:      'Personal',
  administrador: 'Administración Central',
  admin:         'Administración Central',
  guardia:       'Guardia',
};

@Component({
  selector: 'app-layout',
  standalone: false,
  templateUrl: './layout.html',
  styleUrl:    './layout.css',
})
export class Layout implements OnInit {
  menuItems: MenuItem[] = [];
  currentRoute = '';
  userAccount  = '';
  userRole     = '';
  userInitials = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.userAccount = localStorage.getItem('numeroCuenta') || '';
    this.userRole    = localStorage.getItem('rolUsuario')    || '';

    // Redirigir a login si no hay usuario autenticado
    /*
    if (!this.userAccount) {
      this.router.navigate(['/login']);
      return;
    }
    */

    this.menuItems   = ROLE_MENUS[this.userRole] || [];
    this.userInitials = this.userAccount.slice(0, 2).toUpperCase();
    this.currentRoute = this.router.url;

    if ((this.router.url === '/home' || this.router.url === '/home/') && this.menuItems.length > 0) {
      this.router.navigate([this.menuItems[0].route]);
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentRoute = e.urlAfterRedirects; });
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    localStorage.removeItem('numeroCuenta');
    localStorage.removeItem('rolUsuario');
    this.router.navigate(['/login']);
  }

  getRoleLabel(): string {
    return ROLE_LABELS[this.userRole] || this.userRole;
  }

  getIconPath(name: string): string {
    const icons: Record<string, string> = {
      list:           'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
      plus:           'M12 5v14M5 12h14',
      bell:           'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
      inbox:          'M22 12h-6l-2 3H10l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      package:        'M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
      refresh:        'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
      chart:          'M18 20V10M12 20V4M6 20v-6',
      users:          'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
      shield:         'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
      settings:       'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      clipboard:      'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9V2M12 11h4M12 16h4M8 11h.01M8 16h.01',
      logout:         'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    };
    return icons[name] || '';
  }
}
