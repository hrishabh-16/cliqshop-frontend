// cliqshop-frontend\src\app\services\user\user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface User {
  userId: number;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'USER' | 'ADMIN';
  enabled: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:9000/api/users';

  constructor(private http: HttpClient) { }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all users
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      map(users => {
        // Convert dates to proper format and ensure boolean values are correct
        return users.map(user => ({
          ...user,
          createdAt: new Date(user.createdAt).toISOString(),
          enabled: this.normalizeBoolean(user.enabled)
        }));
      }),
      catchError(this.handleError)
    );
  }

  // Normalize boolean values that might come from the server
  private normalizeBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value === '1' || value === 'true';
    return Boolean(value);
  }

  // Get admin users only
  getAdminUsers(): Observable<User[]> {
    return this.getAllUsers().pipe(
      map(users => users.filter(user => user.role === 'ADMIN')),
      catchError(this.handleError)
    );
  }

  // Get regular users only
  getRegularUsers(): Observable<User[]> {
    return this.getAllUsers().pipe(
      map(users => users.filter(user => user.role === 'USER')),
      catchError(this.handleError)
    );
  }

  // Get user by ID
  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      map(user => ({
        ...user,
        enabled: this.normalizeBoolean(user.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Create new user
  createUser(user: Omit<User, 'userId' | 'createdAt'>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      map(newUser => ({
        ...newUser,
        enabled: this.normalizeBoolean(newUser.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Update user
  updateUser(userId: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, user).pipe(
      map(updatedUser => ({
        ...updatedUser,
        enabled: this.normalizeBoolean(updatedUser.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Toggle user status
  toggleUserStatus(userId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${userId}/status`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // Delete user
  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Change password
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/password`, null, {
      params: {
        oldPassword,
        newPassword
      }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Format date helper
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  }
}