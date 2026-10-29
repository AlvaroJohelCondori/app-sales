import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: 'resumen',
        loadComponent: () =>
          import('./features/overview/overview.component').then((m) => m.OverviewComponent),
        title: 'Resumen | App Sales',
      },
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
        title: 'Productos | App Sales',
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/sales/sales.component').then((m) => m.SalesComponent),
        title: 'Ventas | App Sales',
      },
      { path: '**', redirectTo: 'resumen' },
    ],
  },
];
