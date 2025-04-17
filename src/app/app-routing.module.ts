import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';
import { AdminGuard } from './guards/admin/admin.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { HomeComponent } from './components/home-component/home-component.component';
import { ProfileComponent } from './components/auth/profile/profile.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { ProductsComponent } from './components/admin/products/products.component';
import { CategoriesComponent } from './components/admin/categories/categories.component';
import { OrdersComponent } from './components/admin/orders/orders.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { UsersComponent } from './components/admin/users/users.component';
import { CartComponent } from './components/cart/cart.component';
import { AdminProfileComponent } from './components/admin/profile/profile.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard] },
  
  // Admin routes
  { 
    path: 'admin/dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'admin/users', 
    component: UsersComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'admin/products', 
    component: ProductsComponent, 
    canActivate: [AuthGuard, AdminGuard]
  },
  { 
    path: 'admin/categories', 
    component: CategoriesComponent, 
    canActivate: [AuthGuard, AdminGuard]
  },
  { 
    path: 'admin/orders', 
    component: OrdersComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },

  // Updated Reports Routes
  { 
    path: 'admin/reports', 
    component: ReportsComponent, 
    canActivate: [AuthGuard, AdminGuard],
    data: { reportType: 'sales' }
  },
  { 
    path: 'admin/reports/sales', 
    component: ReportsComponent, 
    canActivate: [AuthGuard, AdminGuard],
    data: { reportType: 'sales' }
  },
  { 
    path: 'admin/reports/inventory', 
    component: ReportsComponent, 
    canActivate: [AuthGuard, AdminGuard],
    data: { reportType: 'inventory' }
  },
  { 
    path: 'admin/settings/profile', 
    component: AdminProfileComponent, 
    canActivate: [AuthGuard, AdminGuard]
  },
  
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthGuard, AdminGuard]
})
export class AppRoutingModule { }