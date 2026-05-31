import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { IconComponent, IconName } from '../../../shared/ui/icon.component';
import { ButtonComponent } from '../../../shared/ui/button.component';

interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  roles?: Array<'admin' | 'staff'>;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, ButtonComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Tablero', route: '/dashboard', icon: 'dashboard' },
    { label: 'Productos', route: '/products', icon: 'products' },
    { label: 'Inventario', route: '/inventory', icon: 'inventory', roles: ['admin', 'staff'] },
    { label: 'Sucursales', route: '/branches', icon: 'branches' },
    { label: 'Ventas y reportes', route: '/sales', icon: 'sales' },
    { label: 'Documentos', route: '/documents', icon: 'documents' },
    { label: 'Auditoría', route: '/audit', icon: 'audit', roles: ['admin'] },
    { label: 'Analítica IA', route: '/ai-analytics', icon: 'ai', roles: ['admin', 'staff'] },
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
