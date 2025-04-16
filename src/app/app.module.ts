import { NgModule } from '@angular/core';
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
import { CartComponent } from './components/cart/cart.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LoadingSpinnerComponent } from './shared/loading-spinner/loading-spinner.component';

import { AuthGuard } from './guards/auth/auth.guard';
import { AdminGuard } from './guards/admin/admin.guard';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export function tokenGetter() {
  return localStorage.getItem('token');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ProfileComponent,
    DashboardComponent,
    UsersComponent,
    ProductsComponent,
    CategoriesComponent,
    OrdersComponent,
    ReportsComponent,
    CartComponent,
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    FormsModule,
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
    JwtHelperService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
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
export class AppModule {}