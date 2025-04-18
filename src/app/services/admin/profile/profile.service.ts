import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = 'http://localhost:9000/api/users';

  constructor(private http: HttpClient) { }

  /**
   * Get the currently logged in user's profile
   */
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  /**
   * Update the user's profile information
   * @param updatedUser User object with updated information
   */
  updateUserProfile(updatedUser: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, updatedUser);
  }

  /**
   * Change the user's password
   * @param oldPassword The current password
   * @param newPassword The new password
   */
  changePassword(oldPassword: string, newPassword: string): Observable<string> {
    // Explicitly set the response type to text
    return this.http.put(`${this.apiUrl}/password`, null, {
      params: { oldPassword, newPassword },
      responseType: 'text'  // This is the key change
    });
  }
}