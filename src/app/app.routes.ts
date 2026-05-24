import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products-list.component').then((m) => m.ProductsListComponent),
      },
      {
        path: 'products/new',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/products/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'products/:id/edit',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/products/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
      },
      {
        path: 'branches',
        loadComponent: () => import('./features/branches/branches.component').then((m) => m.BranchesComponent),
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/sales/sales.component').then((m) => m.SalesComponent),
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents.component').then((m) => m.DocumentsComponent),
      },
      {
        path: 'audit',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/audit/audit.component').then((m) => m.AuditComponent),
      },
      {
        path: 'ai-analytics',
        canActivate: [roleGuard(['admin', 'staff'])],
        loadComponent: () => import('./features/ai-analytics/ai-analytics.component').then((m) => m.AiAnalyticsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
