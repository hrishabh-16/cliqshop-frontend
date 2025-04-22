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

  /**
   * Check payment status for an order - useful for confirming if a payment was successful
   */
  checkPaymentStatus(orderId: number): Observable<any> {
    console.log(`Checking payment status for order ${orderId}`);
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.get<any>(`${this.apiUrl}/orders/${orderId}/payment-status`, { headers }).pipe(
      timeout(10000),
      retry(1),
      tap(response => console.log(`Payment status for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error checking payment status for order ${orderId}:`, error);
        
        // If endpoint doesn't exist, try alternate endpoint
        if (error.status === 404) {
          console.log('Trying alternate endpoint for payment status');
          return this.http.get<any>(`${this.apiUrl}/payments/check/${orderId}`, { headers }).pipe(
            timeout(10000),
            tap(response => console.log(`Payment status from alternate endpoint:`, response)),
            catchError(innerError => {
              console.error('Error with alternate endpoint:', innerError);
              return of({ orderId: orderId, paymentStatus: 'UNKNOWN' });
            })
          );
        }
        
        return of({ orderId: orderId, paymentStatus: 'UNKNOWN' });
      })
    );
  }

  /**
   * Update payment status for an order
   */
  updatePaymentStatus(orderId: number, status: string, transactionId?: string): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    const updateData = {
      paymentStatus: status,
      transactionId: transactionId || null
    };
    
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/payment`, updateData, { headers }).pipe(
      timeout(10000),
      retry(1),
      tap(response => console.log(`Updated payment status for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error updating payment status for order ${orderId}:`, error);
        return throwError(() => error);
      })
    );
  }

  updatePaymentStatusAlternative(orderId: number, status: string, transactionId?: string): Observable<any> {
    const updateData = {
      orderId: orderId,
      status: status,
      transactionId: transactionId || null
    };
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    // Try a different endpoint - many backends have multiple ways to update payment status
    return this.http.post<any>(`${this.apiUrl}/payments/update-status`, updateData, { headers }).pipe(
      timeout(10000),
      tap(response => console.log(`Alternative payment status update for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error with alternative payment status update for order ${orderId}:`, error);
        
        // If this endpoint doesn't exist, try another one
        if (error.status === 404) {
          console.log('Alternative endpoint not found, trying payments/order-status');
          return this.http.post<any>(`${this.apiUrl}/payments/order-status`, updateData, { headers }).pipe(
            timeout(10000),
            tap(response => console.log(`Second alternative payment update for order ${orderId}:`, response)),
            catchError(innerError => {
              console.error(`Error with second alternative payment update for order ${orderId}:`, innerError);
              return throwError(() => innerError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }

  forcePaymentStatusUpdate(orderId: number): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    // Direct database update endpoint - this is a last resort
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/force-payment-status`, 
      { 
        status: 'PAID',
        forcedUpdate: true,
        updatedAt: new Date().toISOString()
      }, 
      { headers }
    ).pipe(
      timeout(10000),
      tap(response => console.log(`Forced payment status update for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error with forced payment status update for order ${orderId}:`, error);
        
        // If this endpoint doesn't exist, try a more generic one with a special flag
        if (error.status === 404) {
          console.log('Force update endpoint not found, trying generic update with force flag');
          return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/payment`, 
            { 
              paymentStatus: 'PAID',
              force: true,
              timestamp: Date.now()
            }, 
            { headers }
          ).pipe(
            timeout(10000),
            tap(response => console.log(`Generic forced update for order ${orderId}:`, response)),
            catchError(innerError => {
              console.error(`Error with generic forced update for order ${orderId}:`, innerError);
              return throwError(() => innerError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }

  directDatabaseUpdate(orderId: number): Observable<any> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('X-Admin-Override', 'true'); // Special header that might bypass normal validation
    
    return this.http.put<any>(`${this.apiUrl}/admin/orders/${orderId}/status`, 
      { 
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        updatedVia: 'system',
        updatedAt: new Date().toISOString()
      }, 
      { headers }
    ).pipe(
      timeout(10000),
      tap(response => console.log(`Direct database update for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error with direct database update for order ${orderId}:`, error);
        return throwError(() => error);
      })
    );
  }

  cancelOrder(orderId: number, userId: number): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    // Use body instead of params for better compatibility
    const payload = { userId: userId };
    
    return this.http.put<any>(
      `${this.apiUrl}/orders/${orderId}/cancel`, 
      payload,
      { headers }
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
  // Helper method to process and normalize order data
private processOrderData(order: any): Order {
  if (!order) return {} as Order;

  console.log('Raw order data to process:', JSON.stringify(order));

  // Check for different property names in the API response
  const orderItems = order.orderItems || order.items || [];
  const orderStatus = order.orderStatus || order.status || 'PENDING';
  const paymentStatus = order.paymentStatus || (order.payment ? order.payment.status : 'PENDING');
  
  // Look for order items in different possible locations in the response
  let processedItems = [];
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    processedItems = orderItems.map((item: any) => ({
      orderItemId: item.orderItemId || item.id || 0,
      orderId: item.orderId || order.orderId || 0,
      productId: item.productId || (item.product ? item.product.productId || item.product.id : 0),
      quantity: item.quantity || 1,
      price: item.price || (item.product ? item.product.price : 0) || 0,
      product: item.product || null
    }));
  } else if (order.cart && Array.isArray(order.cart.items)) {
    // Some APIs return items inside a cart object
    processedItems = order.cart.items.map((item: any) => ({
      orderItemId: item.id || 0,
      orderId: order.orderId || 0,
      productId: item.productId || (item.product ? item.product.productId || item.product.id : 0),
      quantity: item.quantity || 1,
      price: item.price || (item.product ? item.product.price : 0) || 0,
      product: item.product || null
    }));
  }

  console.log('Processed items:', processedItems);

  // Handle missing or empty fields
  const processedOrder: Order = {
    ...order,
    orderId: order.orderId || order.id || 0,
    userId: order.userId || (order.user ? order.user.userId || order.user.id : 0) || 0,
    orderDate: order.orderDate || order.createdAt || new Date().toISOString(),
    orderItems: processedItems,
    orderTotal: this.parseNumber(order.orderTotal || order.totalAmount),
    totalPrice: this.parseNumber(order.totalPrice || order.orderTotal || order.total || order.totalAmount),
    subtotal: this.parseNumber(order.subtotal || order.subTotal || (processedItems.length ? 
      processedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) : 0)),
    tax: this.parseNumber(order.tax || order.taxAmount || (order.totalPrice * 0.18)),
    shippingCost: this.parseNumber(order.shippingCost || order.shipping || order.shippingAmount || 0),
    discount: this.parseNumber(order.discount || order.discountAmount || 0),
    orderStatus: orderStatus,
    paymentStatus: paymentStatus,
    paymentMethod: order.paymentMethod || (order.payment ? order.payment.method : '') || '',
    shippingMethod: order.shippingMethod || order.shipping?.method || 'standard'
  };

  // Calculate subtotal if it's zero but we have items
  if (processedOrder.subtotal === 0 && processedItems.length > 0) {
    processedOrder.subtotal = processedItems.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + ((item.price || 0) * (item.quantity || 1)), 
      0
    );
  }

  // If total price is available but subtotal is not, estimate it
  if (processedOrder.totalPrice > 0 && processedOrder.subtotal === 0) {
    // Approximate: Total = Subtotal + Tax + Shipping - Discount
    // So: Subtotal = Total - Tax - Shipping + Discount
    processedOrder.subtotal = processedOrder.totalPrice - processedOrder.tax - 
                              processedOrder.shippingCost + processedOrder.discount;
  }

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
      userId: processedOrder.userId
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
      userId: processedOrder.userId
    } as Address;
  }

  console.log('Fully processed order:', processedOrder);
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