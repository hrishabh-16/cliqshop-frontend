import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, retry, timeout, map } from 'rxjs/operators';
import { Order, OrderResponse } from '../../models/order.model';
import { Address } from '../../models/address.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getOrderById(orderId: number): Observable<Order> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`, { headers }).pipe(
      timeout(15000), // Increase timeout for potentially slow connections
      retry(1),
      tap(order => console.log(`Fetched order: ${orderId}`, order)),
      map(order => this.processOrderData(order)), // Process and validate order data
      catchError(this.handleError)
    );
  }

  // Method to get all orders for a user - used for order count
  getUserOrders(userId: number): Observable<OrderResponse | Order[]> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.get<any>(`${this.apiUrl}/orders/user/${userId}`, { headers }).pipe(
      timeout(15000),
      retry(1),
      tap(response => console.log('Fetched user orders:', response)),
      catchError(error => {
        console.error('Error fetching user orders:', error);
        return of({ orders: [], totalItems: 0 });
      })
    );
  }

  getOrdersByUser(userId: number, page: number = 1, pageSize: number = 10): Observable<{ orders: Order[], totalItems: number }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', pageSize.toString());

    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    // First try to get paginated results
    return this.http.get<any>(`${this.apiUrl}/orders/user/${userId}`, { params, headers }).pipe(
      timeout(15000),
      retry(1),
      map(response => {
        console.log('Raw orders response:', response);
        
        // Handle both paginated and non-paginated responses
        if (response && Array.isArray(response)) {
          // API returns array directly
          const processedOrders = response.map((order: any) => this.processOrderData(order));
          return {
            orders: processedOrders,
            totalItems: processedOrders.length
          };
        } else if (response && response.orders) {
          // API returns pagination object
          const processedOrders = response.orders.map((order: any) => this.processOrderData(order));
          return {
            orders: processedOrders,
            totalItems: response.totalItems
          };
        } else if (response && response.content) {
          // Spring Data pagination format
          const processedOrders = response.content.map((order: any) => this.processOrderData(order));
          return {
            orders: processedOrders,
            totalItems: response.totalElements || processedOrders.length
          };
        } else {
          // Single order or unexpected format - try to handle gracefully
          if (response && response.orderId) {
            return {
              orders: [this.processOrderData(response)],
              totalItems: 1
            };
          }
          
          console.error('Unexpected response format:', response);
          return { orders: [], totalItems: 0 };
        }
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of({ orders: [], totalItems: 0 });
      })
    );
  }

  cancelOrder(orderId: number, userId: number): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.put<any>(
      `${this.apiUrl}/orders/${orderId}/cancel`, 
      null,
      { headers, params }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(() => console.log(`Cancelled order: ${orderId}`)),
      catchError(this.handleError)
    );
  }
  
  // Reorder functionality
  reorderItems(orderId: number, userId: number): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.post<any>(
      `${this.apiUrl}/orders/${orderId}/reorder`,
      null,
      { headers, params }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(response => console.log(`Reordered items from order: ${orderId}`, response)),
      catchError(this.handleError)
    );
  }

  // Helper method to process and normalize order data
  private processOrderData(order: any): Order {
    if (!order) return {} as Order;

    // Handle missing or empty fields
    const processedOrder: Order = {
      ...order,
      orderId: order.orderId || 0,
      userId: order.userId || 0,
      orderDate: order.orderDate || new Date().toISOString(),
      orderItems: Array.isArray(order.orderItems) ? order.orderItems.map((item: any) => ({
        ...item,
        orderItemId: item.orderItemId || 0,
        productId: item.productId || (item.product ? item.product.productId : 0),
        quantity: item.quantity || 1,
        price: item.price || 0,
        product: item.product || null
      })) : [],
      orderTotal: this.parseNumber(order.orderTotal),
      totalPrice: this.parseNumber(order.totalPrice || order.orderTotal),
      subtotal: this.parseNumber(order.subtotal),
      tax: this.parseNumber(order.tax),
      shippingCost: this.parseNumber(order.shippingCost),
      discount: this.parseNumber(order.discount),
      orderStatus: order.orderStatus || 'PENDING',
      paymentStatus: order.paymentStatus || 'PENDING',
      paymentMethod: order.paymentMethod || '',
      shippingMethod: order.shippingMethod || ''
    };

    // Handle missing shipping/billing address
    if (!order.shippingAddress) {
      processedOrder.shippingAddress = {
        addressId: 0,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        isDefault: false,
        addressType: 'SHIPPING',
        userId: order.userId || 0
      } as Address;
    }
    
    if (!order.billingAddress) {
      processedOrder.billingAddress = order.shippingAddress || {
        addressId: 0,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        isDefault: false,
        addressType: 'BILLING',
        userId: order.userId || 0
      } as Address;
    }

    console.log('Processed order:', processedOrder);
    return processedOrder;
  }

  // Helper to safely parse numeric values
  private parseNumber(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Could not connect to the server. Please check your internet connection and try again.';
    } else if (error.status === 404) {
      errorMessage = 'The requested order was not found.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}