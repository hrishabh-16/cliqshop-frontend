import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';
import { AdminGuard } from './guards/admin/admin.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { HomeComponent } from './components/home-component/home-component.component';
import { ProfileComponent } from './components/auth/profile/profile.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { ProductsComponent as AdminProductsComponent } from './components/admin/products/products.component';
import { CategoriesComponent as AdminCategoriesComponent } from './components/admin/categories/categories.component';
import { OrdersComponent as AdminOrdersComponent } from './components/admin/orders/orders.component';
import { InventoryComponent } from './components/admin/inventory/inventory.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { UsersComponent } from './components/admin/users/users.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { AdminProfileComponent } from './components/admin/profile/profile.component';
import { ProductsComponent } from './components/products/products.component';
import { CategoriesComponent } from './components/categories/categories.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { OrdersComponent as UserOrdersComponent } from './components/orders/orders.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

const routes: Routes = [
  // Public routes that don't require authentication
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'user/profile', component: UserProfileComponent, canActivate: [AuthGuard] },

  
  // Protected routes that require authentication
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
  
  // User Orders (renamed to avoid conflict with admin orders)
  { 
    path: 'orders', 
    component: UserOrdersComponent,
    canActivate: [AuthGuard]
  },
  
  // Order Confirmation Routes
  { 
    path: 'order-confirmation', 
    component: OrderConfirmationComponent
  },
  { 
    path: 'order/:id', 
    component: OrderConfirmationComponent
  },
  
  // Admin routes - require both auth and admin role
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
    component: AdminProductsComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/categories',
    component: AdminCategoriesComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  // Inventory Management Routes - NEW
  {
    path: 'admin/inventory',
    component: InventoryComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/inventory/low-stock',
    component: InventoryComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { view: 'lowStock' }
  },
  {
    path: 'admin/inventory/warehouse',
    component: InventoryComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { view: 'warehouse' }
  },
  {
    path: 'admin/orders',
    component: AdminOrdersComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  // Order status-specific routes
  {
    path: 'admin/orders/pending',
    component: AdminOrdersComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { status: 'PENDING' }
  },
  {
    path: 'admin/orders/processing',
    component: AdminOrdersComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { status: 'PROCESSING' }
  },
  {
    path: 'admin/orders/completed',
    component: AdminOrdersComponent,
    canActivate: [AuthGuard, AdminGuard],
    data: { status: 'DELIVERED' }
  },
  // Report Routes
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
  
  // Default redirects
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 64]
  })],
  exports: [RouterModule],
  providers: [AuthGuard, AdminGuard]
})
export class AppRoutingModule { }