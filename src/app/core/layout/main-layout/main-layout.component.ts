import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  roles?: Array<'admin' | 'staff'>;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Tablero', route: '/dashboard' },
    { label: 'Productos', route: '/products' },
    { label: 'Inventario', route: '/inventory', roles: ['admin', 'staff'] },
    { label: 'Sucursales', route: '/branches' },
    { label: 'Ventas y reportes', route: '/sales' },
    { label: 'Documentos', route: '/documents' },
    { label: 'Auditoría', route: '/audit', roles: ['admin'] },
    { label: 'Analítica IA', route: '/ai-analytics', roles: ['admin', 'staff'] },
  ];

  canSee(item: NavItem): boolean {
    if (!item.roles) return true;
    return this.auth.hasRole(...item.roles);
  }

  logout(): void {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
