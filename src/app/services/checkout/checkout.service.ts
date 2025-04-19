import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, retry, timeout } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Address } from '../../models/address.model';
import { Order } from '../../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = 'http://localhost:9000/api';
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getUserAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.apiUrl}/addresses/user/${userId}`).pipe(
      timeout(10000), // Set timeout to 10 seconds
      retry(1),
      tap(addresses => console.log(`Fetched addresses for user: ${userId}`, addresses)),
      catchError(this.handleError)
    );
  }

  getAddressById(addressId: number): Observable<Address> {
    return this.http.get<Address>(`${this.apiUrl}/addresses/${addressId}`).pipe(
      timeout(10000),
      retry(1),
      tap(address => console.log(`Fetched address: ${addressId}`, address)),
      catchError(this.handleError)
    );
  }

  saveAddress(userId: number, address: Address): Observable<Address> {
    // If address has an ID, it's an update
    if (address.addressId) {
      return this.updateAddress(address);
    }
    
    // Otherwise, it's a new address
    return this.createAddress(userId, address);
  }

  private createAddress(userId: number, address: Address): Observable<Address> {
    return this.http.post<Address>(`${this.apiUrl}/addresses/${userId}`, address).pipe(
      timeout(10000),
      retry(1),
      tap(newAddress => console.log('Created new address:', newAddress)),
      catchError(this.handleError)
    );
  }

  private updateAddress(address: Address): Observable<Address> {
    return this.http.put<Address>(`${this.apiUrl}/addresses/${address.addressId}`, address).pipe(
      timeout(10000),
      retry(1),
      tap(updatedAddress => console.log('Updated address:', updatedAddress)),
      catchError(this.handleError)
    );
  }

  deleteAddress(addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/addresses/${addressId}`).pipe(
      timeout(10000),
      retry(1),
      tap(() => console.log(`Deleted address: ${addressId}`)),
      catchError(this.handleError)
    );
  }

  placeOrder(orderRequest: any): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, orderRequest).pipe(
      timeout(15000), // Longer timeout for order placement
      tap(order => console.log('Order placed successfully:', order)),
      catchError(this.handleError)
    );
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`).pipe(
      timeout(10000),
      retry(1),
      tap(order => console.log(`Fetched order: ${orderId}`, order)),
      catchError(this.handleError)
    );
  }

  getOrdersByUser(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/user/${userId}`).pipe(
      timeout(10000),
      retry(1),
      tap(orders => console.log(`Fetched orders for user: ${userId}`, orders)),
      catchError(this.handleError)
    );
  }

  cancelOrder(orderId: number, userId: number): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/orders/${orderId}/cancel`,
      null,
      { params: new HttpParams().set('userId', userId.toString()) }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(() => console.log(`Cancelled order: ${orderId}`)),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}