import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';

interface User {
  userId: number;
  username: string;
  name?: string;
  email?: string;
  role: string;
}

interface RegisterResponse {
  userId: number;
  role: string;
  [key: string]: any; // For additional properties
}

interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  name?: string;
  email?: string;
  role: string;
}

interface RegisterRequest {
  username: string;
  name?: string;
  email?: string;
  password: string;
  [key: string]: any; // For additional properties
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:9000/api/auth';
  private jwtHelper = new JwtHelperService();
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor(private http: HttpClient) {
    // Initialize with current user if available
    const user = this.getCurrentUser();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  login(credentials: {username: string, password: string}): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response?.token) {
          this.storeAuthData(response);
          this.currentUserSubject.next(this.getCurrentUser());
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error('Login failed. Please check your credentials.'));
      })
    );
  }

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response?.userId) {
          const user: User = {
            userId: response.userId,
            username: userData.username,
            role: response.role || 'USER'
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => new Error('Registration failed. Please try again.'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('currentUser');
    try {
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  getCurrentUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.userId ?? null;
  }

  getCurrentUserObservable(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  private storeAuthData(authData: LoginResponse): void {
    try {
      localStorage.setItem('token', authData.token);
      
      const userData: User = {
        userId: authData.userId,
        username: authData.username,
        name: authData.name,
        email: authData.email,
        role: authData.role || 'USER'
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  getTokenData(): any {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      return this.jwtHelper.decodeToken(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
}