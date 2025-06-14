import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, tap, retry, timeout, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { InventoryService } from '../inventory/inventory.service';
import { Address } from '../../models/address.model';
import { Order, OrderRequest } from '../../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = 'http://localhost:9000/api';
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private inventoryService: InventoryService // NEW: Inject inventory service
  ) { }

  getUserAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.apiUrl}/addresses/user/${userId}`).pipe(
      timeout(10000),
      retry(2),
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
    // Clean the object for API
    const cleanedAddress = this.cleanObject(address);
    
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    return this.http.post<Address>(
      `${this.apiUrl}/addresses/${userId}`, 
      cleanedAddress,
      { headers }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(newAddress => console.log('Created new address:', newAddress)),
      catchError(this.handleError)
    );
  }

  private updateAddress(address: Address): Observable<Address> {
    // Clean the object for API
    const cleanedAddress = this.cleanObject(address);
    
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    return this.http.put<Address>(
      `${this.apiUrl}/addresses/${address.addressId}`, 
      cleanedAddress,
      { headers }
    ).pipe(
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

  placeOrder(orderRequest: OrderRequest): Observable<Order> {
    // Ensure orderRequest has all required fields
    const validatedOrderRequest = this.validateOrderRequest(orderRequest);
    
    // Clean the object to match backend expectations
    const cleanedOrderRequest = this.cleanObject(validatedOrderRequest);
    
    // Create headers that match what the backend expects
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    console.log('Sending order request:', JSON.stringify(cleanedOrderRequest));
    
    return this.http.post<Order>(
      `${this.apiUrl}/orders`, 
      cleanedOrderRequest,
      { headers }
    ).pipe(
      timeout(15000),
      tap(order => console.log('Order placed successfully:', order)),
      // NEW: After order is placed, decrement inventory
      switchMap(order => {
        if (order && order.orderItems && order.orderItems.length > 0) {
          console.log('Decrementing inventory for placed order...');
          
          // Extract product IDs and quantities from order items
          const inventoryUpdates = order.orderItems.map(item => ({
            productId: item.productId || (item.product?.productId || 0),
            quantity: item.quantity || 1
          }));
          
          // Decrement inventory and return the original order
          return this.inventoryService.decrementInventoryForOrder(inventoryUpdates).pipe(
            tap(inventoryResults => {
              console.log('Inventory decremented successfully:', inventoryResults);
            }),
            catchError(inventoryError => {
              console.error('Error decrementing inventory (order still placed):', inventoryError);
              // Don't fail the order if inventory update fails
              return of([]);
            }),
            // Always return the original order
            switchMap(() => of(order))
          );
        } else {
          // No items to decrement, just return the order
          return of(order);
        }
      }),
      catchError(error => {
        console.error('Error placing order:', error);
        
        // For debugging - log detailed error information
        if (error.error) {
          console.error('Error details:', error.error);
        }
        
        return this.handleError(error);
      })
    );
  }

  // Validate order request before sending to API
  private validateOrderRequest(orderRequest: OrderRequest): OrderRequest {
    // Create a copy to avoid mutating the original
    const validatedRequest = { ...orderRequest };
    
    // Ensure items array is valid
    if (!Array.isArray(validatedRequest.items) || validatedRequest.items.length === 0) {
      console.error('Invalid or empty items array in order request');
      validatedRequest.items = validatedRequest.items || [];
    }
    
    // Validate each item
    validatedRequest.items = validatedRequest.items.map(item => ({
      productId: item.productId || 0,
      quantity: item.quantity || 1,
      price: typeof item.price === 'number' ? item.price : 0
    }));
    
    // Ensure other required fields
    validatedRequest.userId = validatedRequest.userId || 0;
    validatedRequest.totalPrice = validatedRequest.totalPrice || 0;
    validatedRequest.shippingMethod = validatedRequest.shippingMethod || 'standard';
    validatedRequest.paymentMethod = validatedRequest.paymentMethod || 'card';
    
    return validatedRequest;
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

  // NEW: Enhanced cancel order with inventory restoration
  cancelOrder(orderId: number, userId: number): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    // First get the order details to know what inventory to restore
    return this.getOrderById(orderId).pipe(
      switchMap(order => {
        // Try to use body instead of params, as some backends may expect this format
        const payload = { userId: userId };
        
        return this.http.put<any>(
          `${this.apiUrl}/orders/${orderId}/cancel`,
          payload,
          { headers }
        ).pipe(
          timeout(10000),
          retry(1),
          tap(() => console.log(`Cancelled order: ${orderId}`)),
          // After successful cancellation, restore inventory
          switchMap(cancelResult => {
            if (order && order.orderItems && order.orderItems.length > 0) {
              console.log('Restoring inventory for cancelled order...');
              
              const inventoryRestores = order.orderItems.map(item => ({
                productId: item.productId || (item.product?.productId || 0),
                quantity: item.quantity || 1
              }));
              
              return this.inventoryService.restoreInventoryForCancelledOrder(inventoryRestores).pipe(
                tap(inventoryResults => {
                  console.log('Inventory restored successfully:', inventoryResults);
                }),
                catchError(inventoryError => {
                  console.error('Error restoring inventory (order still cancelled):', inventoryError);
                  // Don't fail the cancellation if inventory restore fails
                  return of([]);
                }),
                // Always return the original cancel result
                switchMap(() => of(cancelResult))
              );
            } else {
              // No items to restore, just return the cancel result
              return of(cancelResult);
            }
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * New method to create Stripe Checkout Session
   */
  createCheckoutSession(paymentRequest: any): Observable<any> {
    const cleanedPaymentRequest = this.cleanObject(paymentRequest);
    
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    return this.http.post<any>(
      `${this.apiUrl}/payments/create-checkout-session`, 
      cleanedPaymentRequest,
      { headers }
    ).pipe(
      timeout(15000),
      tap(response => console.log('Checkout session created:', response)),
      catchError((error) => {
        console.error('Error creating checkout session:', error);
        
        // For testing if backend is unavailable or having issues
        if (error.status === 0 || error.status === 404 || error.status === 500) {
          console.log('Using mock checkout session data for testing');
          
          // Generate a mock checkout session with redirect URL
          return of({
            success: true,
            sessionId: 'cs_test_' + Math.random().toString(36).substring(2, 15),
            url: 'https://checkout.stripe.com/pay/mock-session',
            status: 'created',
            message: null
          });
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * New method to verify payment completion after Stripe redirect
   */
  verifyPaymentCompletion(sessionId: string, orderId: number): Observable<any> {
    const params = new HttpParams()
      .set('sessionId', sessionId)
      .set('orderId', orderId.toString());
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.get<any>(`${this.apiUrl}/payments/verify-session`, { params, headers }).pipe(
      timeout(15000),
      tap(response => console.log('Payment verification result:', response)),
      catchError(error => {
        console.error('Error verifying payment completion:', error);
        
        // If endpoint doesn't exist, try alternate endpoint
        if (error.status === 404) {
          return this.http.post<any>(`${this.apiUrl}/payments/verify-payment`, 
            { sessionId, orderId },
            { headers }
          ).pipe(
            timeout(10000),
            tap(response => console.log('Alternate payment verification result:', response)),
            catchError(altError => {
              console.error('Error with alternate verification endpoint:', altError);
              return throwError(() => altError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Method to get order status, including payment status
   */
  getOrderStatus(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/${orderId}/status`).pipe(
      timeout(10000),
      tap(response => console.log(`Order status for ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error getting order status for ${orderId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update payment status for an order
   */
  updatePaymentStatus(orderId: number, paymentStatus: string, transactionId?: string): Observable<any> {
    const updateData = {
      orderId: orderId,
      paymentStatus: paymentStatus,
      transactionId: transactionId || null
    };
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/payment`, updateData, { headers }).pipe(
      timeout(10000),
      tap(response => console.log(`Updated payment status for order ${orderId}:`, response)),
      catchError(error => {
        console.error(`Error updating payment status for order ${orderId}:`, error);
        
        // Try alternate endpoint if the first one fails
        if (error.status === 404) {
          return this.http.post<any>(
            `${this.apiUrl}/payments/update-status`,
            updateData,
            { headers }
          ).pipe(
            timeout(10000),
            tap(response => console.log(`Updated payment status via alternate endpoint:`, response)),
            catchError(altError => {
              console.error('Error with alternate payment update endpoint:', altError);
              return throwError(() => altError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }

  // Legacy methods kept for compatibility
  createPaymentIntent(paymentRequest: any): Observable<any> {
    const cleanedPaymentRequest = this.cleanObject(paymentRequest);
    
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    return this.http.post<any>(
      `${this.apiUrl}/payments/create-payment-intent`, 
      cleanedPaymentRequest,
      { headers }
    ).pipe(
      timeout(15000),
      tap(response => console.log('Payment intent created:', response)),
      catchError((error) => {
        console.error('Error creating payment intent:', error);
        
        // For testing if backend is unavailable or having issues
        if (error.status === 0 || error.status === 404 || error.status === 500) {
          console.log('Using mock payment intent data for testing');
          
          // Generate a mock payment intent
          const mockPaymentIntentId = 'pi_mock_' + Math.random().toString(36).substring(2, 15);
          
          return of({
            success: true,
            clientSecret: mockPaymentIntentId + '_secret_' + Math.random().toString(36).substring(2, 15),
            paymentIntentId: mockPaymentIntentId,
            status: 'requires_payment_method',
            message: null
          });
        }
        
        return throwError(() => error);
      })
    );
  }

  confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Observable<any> {
    const params = new HttpParams()
      .set('paymentIntentId', paymentIntentId)
      .set('paymentMethodId', paymentMethodId);
      
    return this.http.post<any>(`${this.apiUrl}/payments/confirm-payment-intent`, null, { params }).pipe(
      timeout(15000),
      tap(response => console.log('Payment intent confirmed:', response)),
      catchError(error => {
        console.error('Error confirming payment intent:', error);
        
        // For testing if backend is unavailable
        if (error.status === 0 || error.status === 404 || error.status === 500) {
          return of({
            success: true,
            status: 'succeeded',
            message: 'Mock payment confirmation for testing'
          });
        }
        
        return throwError(() => error);
      })
    );
  }

  cancelPaymentIntent(paymentIntentId: string): Observable<any> {
    const params = new HttpParams().set('paymentIntentId', paymentIntentId);
      
    return this.http.post<any>(`${this.apiUrl}/payments/cancel-payment-intent`, null, { params }).pipe(
      timeout(10000),
      tap(response => console.log('Payment intent cancelled:', response)),
      catchError(this.handleError)
    );
  }

  getPaymentIntent(paymentIntentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments/payment-intent/${paymentIntentId}`).pipe(
      timeout(10000),
      tap(response => console.log('Payment intent retrieved:', response)),
      catchError(this.handleError)
    );
  }

  getStripeConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments/config`).pipe(
      timeout(10000),
      retry(1),
      tap(config => console.log('Fetched Stripe config:', config)),
      catchError(error => {
        console.error('Error fetching Stripe config:', error);
        
        // Return the actual publishable key from your application.properties
        // This ensures the Stripe integration works even if the backend endpoint fails
        return of({
          publishableKey: 'pk_test_51PX0GoEwavEcfWl1BeMUetVJmMx0uwoVCSInMUu8OJxFf2fXgZppwfG9scwfE6Ra9QRJu1lnTCq56FNc7ZgkXVB000nmnzVM1E',
          isMockData: true
        });
      })
    );
  }

  /**
   * Helper method to remove undefined/null values from objects before sending to API
   */
  private cleanObject(obj: any): any {
    if (!obj) return {};
    
    const cleanedObj = { ...obj };
    
    // Remove undefined or null values
    Object.keys(cleanedObj).forEach(key => {
      if (cleanedObj[key] === undefined || cleanedObj[key] === null) {
        delete cleanedObj[key];
      }
    });
    
    return cleanedObj;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Network error (server not reachable)
      errorMessage = 'Could not connect to the server. Please check your internet connection and try again.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status === 400) {
      errorMessage = 'Bad request. Please check your input data.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
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