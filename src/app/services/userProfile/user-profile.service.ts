import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { Address } from '../../models/address.model';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private apiUrl = 'http://localhost:9000/api/users';
  private addressApiUrl = 'http://localhost:9000/api/addresses';

  constructor(private http: HttpClient) { }

  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateUserProfile(updatedUser: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, updatedUser)
      .pipe(
        catchError(this.handleError)
      );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<string> {
    return this.http.put(`${this.apiUrl}/password`, null, {
      params: { oldPassword, newPassword },
      responseType: 'text'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Address CRUD Operations
  getAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.addressApiUrl}/user/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  addAddress(userId: number, address: Partial<Address>): Observable<Address> {
    return this.http.post<Address>(`${this.addressApiUrl}/${userId}`, address)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateAddress(addressId: number, address: Partial<Address>): Observable<Address> {
    return this.http.put<Address>(`${this.addressApiUrl}/${addressId}`, address)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Basic delete address method
  deleteAddress(addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.addressApiUrl}/${addressId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Force delete address method with override parameter to bypass constraints
  forceDeleteAddress(addressId: number): Observable<void> {
    // Add force=true parameter to bypass any constraints on the backend
    return this.http.delete<void>(`${this.addressApiUrl}/${addressId}`, {
      params: { force: 'true' }
    }).pipe(
      catchError(this.handleError)
    );
  }

  setDefaultAddress(addressId: number): Observable<Address> {
    return this.http.put<Address>(`${this.addressApiUrl}/${addressId}/set-default`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // Generic error handler
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Try to extract meaningful error message from the response
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        }
      }
    }
    
    console.error('API Error:', errorMessage, error);
    return throwError(() => error);
  }
}