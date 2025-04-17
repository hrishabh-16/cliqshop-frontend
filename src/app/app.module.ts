import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { JwtModule, JwtHelperService } from '@auth0/angular-jwt';
import { SocialLoginModule, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { HomeComponent } from './components/home-component/home-component.component'; 
import { AuthInterceptor } from './interceptors/auth/auth.interceptor';
import { ProfileComponent } from './components/auth/profile/profile.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { ProductsComponent } from './components/admin/products/products.component';
import { CategoriesComponent } from './components/admin/categories/categories.component';
import { OrdersComponent } from './components/admin/orders/orders.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { AdminProfileComponent } from './components/admin/profile/profile.component';
import { CartComponent } from './components/cart/cart.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LoadingSpinnerComponent } from './shared/loading-spinner/loading-spinner.component';
import { AuthGuard } from './guards/auth/auth.guard';
import { AdminGuard } from './guards/admin/admin.guard';
import { CommonModule, DatePipe } from '@angular/common'; // Added DatePipe here
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TruncatePipe } from './shared/pipes/truncate.pipe';

import { CategoryService } from './services/category/category.service';
import { ReportService } from './services/report/report.service';
import { InventoryService } from './services/inventory/inventory.service';



export function tokenGetter() {
  return localStorage.getItem('token');
}

// Add icons to the library
library.add(fas);

export function preloadCategories(categoryService: CategoryService) {
  return () => {
    console.log('Preloading categories at app startup...');
    return new Promise((resolve) => {
      categoryService.getAllCategories().subscribe({
        next: (categories) => {
          console.log('Categories preloaded successfully:', categories);
          resolve(true);
        },
        error: (error) => {
          console.error('Failed to preload categories:', error);
          resolve(false);
        }
      });
    });
  };
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ProfileComponent,
    RegisterComponent,
    HomeComponent,
    ProfileComponent,
    AdminProfileComponent, // Added the new AdminProfileComponent
    DashboardComponent,
    UsersComponent,
    ProductsComponent,
    CategoriesComponent,
    OrdersComponent,
    ReportsComponent,
    CartComponent,
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent,
    TruncatePipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule, // This is needed for formGroup
    RouterModule,
    CommonModule, // This provides DatePipe and other common directives
    FormsModule, // For template-driven forms
    FontAwesomeModule,
    SocialLoginModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['localhost:9000'],
        disallowedRoutes: [
          'http://localhost:9000/api/auth/login',
          'http://localhost:9000/api/auth/register',
          'http://localhost:9000/api/auth/oauth2/google'
        ]
      }
    })
  ],
  providers: [
    ReportService,
    InventoryService,
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: AuthInterceptor, 
      multi: true 
    },
    JwtHelperService,
    DatePipe, // Add DatePipe to providers if you want to use it in components
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    {
      provide: APP_INITIALIZER,
      useFactory: preloadCategories,
      deps: [CategoryService],
      multi: true
    },
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '319226536009-oe4ajt4883l6vban38kq8lpns2nf66rt.apps.googleusercontent.com',
              {
                scopes: 'profile email',
                prompt: 'select_account'
              }
            )
          }
        ],
        onError: (err) => {
          console.error('SocialAuthService error:', err);
        }
      } as SocialAuthServiceConfig,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }