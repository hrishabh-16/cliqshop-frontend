// cliqshop-frontend\src\app\services\user\user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User } from '../../models/user.model';

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
      
      // If there's a specific message from the server
      if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all users
  getAllUsers(): Observable<User[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<User[]>(this.apiUrl, { headers }).pipe(
      map(users => {
        // Convert dates to proper format and ensure boolean values are correct
        return users.map(user => ({
          ...user,
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
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
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<User>(`${this.apiUrl}/${userId}`, { headers }).pipe(
      map(user => ({
        ...user,
        enabled: this.normalizeBoolean(user.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Create new user
  createUser(user: Omit<User, 'userId' | 'createdAt'>): Observable<User> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.post<User>(this.apiUrl, user, { headers }).pipe(
      map(newUser => ({
        ...newUser,
        enabled: this.normalizeBoolean(newUser.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Update user
  updateUser(userId: number, user: Partial<User>): Observable<User> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.put<User>(`${this.apiUrl}/${userId}`, user, { headers }).pipe(
      map(updatedUser => ({
        ...updatedUser,
        enabled: this.normalizeBoolean(updatedUser.enabled)
      })),
      catchError(this.handleError)
    );
  }

  // Toggle user status - Fixed to properly handle status toggle and avoid false errors
  toggleUserStatus(userId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Send empty object as required by some APIs
    return this.http.put<any>(`${this.apiUrl}/${userId}/status`, {}, { headers }).pipe(
      tap(response => {
        console.log('Toggle status response:', response);
      }),
      catchError(error => {
        // Special case: if we get a 200 OK status but with an error in the body
        // (which is incorrect API behavior but sometimes happens)
        if (error.status === 200) {
          console.log('Got 200 status but error in response body, treating as success');
          return of({ success: true, message: 'User status updated successfully' });
        }
        return this.handleError(error);
      })
    );
  }

  // Delete user
  deleteUser(userId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.delete<any>(`${this.apiUrl}/${userId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Change password
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    const body = {
      oldPassword,
      newPassword
    };
    
    return this.http.put<any>(`${this.apiUrl}/password`, body, { headers }).pipe(
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