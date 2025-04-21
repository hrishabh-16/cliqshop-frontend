import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  updateUserProfile(updatedUser: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, updatedUser);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<string> {
    return this.http.put(`${this.apiUrl}/password`, null, {
      params: { oldPassword, newPassword },
      responseType: 'text'
    });
  }

  // Address CRUD Operations
  getAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.addressApiUrl}/user/${userId}`);
  }

  addAddress(userId: number, address: Partial<Address>): Observable<Address> {
    return this.http.post<Address>(`${this.addressApiUrl}/${userId}`, address);
  }

  updateAddress(addressId: number, address: Partial<Address>): Observable<Address> {
    return this.http.put<Address>(`${this.addressApiUrl}/${addressId}`, address);
  }

  deleteAddress(addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.addressApiUrl}/${addressId}`);
  }

  setDefaultAddress(addressId: number): Observable<Address> {
    return this.http.put<Address>(`${this.addressApiUrl}/${addressId}/set-default`, {});
  }
}
