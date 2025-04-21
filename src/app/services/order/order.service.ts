import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, retry, timeout } from 'rxjs/operators';
import { Order, OrderRequest, OrderResponse, OrderStatus } from '../../models/order.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  // Consider making this configurable via environment.ts
  private apiUrl = 'http://localhost:9000/api';
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getOrderById(orderId: number): Observable<Order> {
    const headers = this.authService.isLoggedIn() ? this.getAuthHeaders() : new HttpHeaders();
    
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`, { headers }).pipe(
      timeout(10000),
      retry(1),
      tap(order => console.log(`Fetched order: ${orderId}`, order)),
      catchError(this.handleError)
    );
  }

  getOrdersByUser(userId: number, page: number = 1, size: number = 10): Observable<OrderResponse> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get<OrderResponse>(`${this.apiUrl}/orders/user/${userId}`, { headers, params }).pipe(
      timeout(10000),
      retry(2), // Increased retries for reliability
      tap(response => console.log(`Fetched orders for user: ${userId}`, response)),
      catchError(this.handleError)
    );
  }

  createOrder(orderRequest: OrderRequest): Observable<Order> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<Order>(`${this.apiUrl}/orders`, orderRequest, { headers }).pipe(
      timeout(15000),
      tap(order => console.log('Order created:', order)),
      catchError(this.handleError)
    );
  }

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/status`, { status }, { headers }).pipe(
      timeout(10000),
      tap(order => console.log(`Updated order ${orderId} status to ${status}:`, order)),
      catchError(this.handleError)
    );
  }

  cancelOrder(orderId: number, userId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/cancel`, null, { headers, params }).pipe(
      timeout(10000),
      tap(() => console.log(`Cancelled order: ${orderId}`)),
      catchError(this.handleError)
    );
  }

  getOrdersCount(userId: number): Observable<number> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<number>(`${this.apiUrl}/orders/user/${userId}/count`, { headers }).pipe(
      timeout(10000), // Increased timeout
      retry(3), // More retries for this critical endpoint
      tap(count => console.log(`User ${userId} has ${count} orders`)),
      catchError(this.handleError)
    );
  }

  getRecentOrders(userId: number, limit: number = 5): Observable<Order[]> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<Order[]>(`${this.apiUrl}/orders/user/${userId}/recent`, { headers, params }).pipe(
      timeout(10000),
      retry(2),
      tap(orders => console.log(`Fetched recent orders for user: ${userId}`, orders)),
      catchError(this.handleError)
    );
  }

  trackOrder(orderId: number, email: string): Observable<Order> {
    const params = new HttpParams()
      .set('email', email);
      
    return this.http.get<Order>(`${this.apiUrl}/orders/track/${orderId}`, { params }).pipe(
      timeout(10000),
      retry(1),
      tap(order => console.log(`Tracked order: ${orderId}`, order)),
      catchError(this.handleError)
    );
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Could not connect to the server. Please make sure the backend service is running at ' + this.apiUrl;
    } else if (error.status === 404) {
      errorMessage = 'The requested order was not found.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to access this order.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid order data. Please check your information and try again.';
    } else if (error.error && typeof error.error.message === 'string') {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error ${error.status}: ${error.statusText}`;
    }
    
    console.error('Order service error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}