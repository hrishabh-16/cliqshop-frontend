import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.authService.login(this.credentials).subscribe(
      (response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({
          username: response.username,
          name: response.name,
          email: response.email,
          role: response.role
        }));
        
        if (response.role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      (error) => {
        this.errorMessage = error.error || 'Login failed. Please try again.';
      }
    );
  }
}