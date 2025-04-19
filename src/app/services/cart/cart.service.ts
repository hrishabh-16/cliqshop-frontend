import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, retry, timeout, finalize } from 'rxjs/operators';
import { Cart, CartItem } from '../../models/cart.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:9000/api/cart';
  
  constructor(
    private http: HttpClient, 
    private authService: AuthService
  ) { }

  getCartByUserId(userId: number | undefined | null): Observable<Cart | null> {
    if (!userId) {
      const user = this.authService.getCurrentUser();
      userId = user?.userId;
      
      if (!userId) {
        console.error('No valid userId available');
        return of(this.createEmptyCart());
      }
    }
    
    console.log(`Fetching cart for user ID: ${userId}`);
    
    return this.http.get<Cart>(`${this.apiUrl}/${userId}`).pipe(
      timeout(10000), // Set timeout to 10 seconds
      retry(2), // Retry twice if the request fails
      tap(cart => console.log(`Fetched cart for user: ${userId}`, cart)),
      catchError(error => {
        console.error(`getCartByUserId failed:`, error);
        return of(this.createEmptyCart(userId));
      })
    );
  }

  addToCart(userId: number | undefined | null, productId: number, quantity: number): Observable<Cart | null> {
    const user = this.authService.getCurrentUser();
    userId = userId || user?.userId;
  
    if (!userId) {
      console.error('Cannot add to cart without a valid userId');
      return throwError(() => new Error('User ID is required'));
    }
  
    console.log(`Adding product ${productId} to cart for user ${userId} with quantity ${quantity}`);
    
    return this.http.post<Cart>(
      `${this.apiUrl}/${userId}/add`,
      null,
      {
        params: new HttpParams()
          .set('productId', productId.toString())
          .set('quantity', quantity.toString())
      }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(cart => console.log('Added item to cart:', productId, quantity, cart)),
      catchError(this.handleError)
    );
  }

  removeCartItem(userId: number | undefined | null, productId: number): Observable<Cart | null> {
    const user = this.authService.getCurrentUser();
    userId = userId || user?.userId;
    
    if (!userId) {
      console.error('Cannot remove from cart without a valid userId');
      return throwError(() => new Error('User ID is required'));
    }
    
    console.log(`Removing product ${productId} from cart for user ${userId}`);
    
    return this.http.delete<Cart>(
      `${this.apiUrl}/${userId}/remove`,
      {
        params: new HttpParams().set('productId', productId.toString())
      }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(cart => console.log('Removed item from cart:', productId, cart)),
      catchError(this.handleError)
    );
  }

  updateCartItemQuantity(userId: number | undefined | null, productId: number, quantity: number): Observable<Cart | null> {
    const user = this.authService.getCurrentUser();
    userId = userId || user?.userId;
    
    if (!userId) {
      console.error('Cannot update cart without a valid userId');
      return throwError(() => new Error('User ID is required'));
    }
    
    console.log(`Updating quantity for product ${productId} to ${quantity} for user ${userId}`);
    
    return this.http.put<Cart>(
      `${this.apiUrl}/${userId}/update`,
      null,
      {
        params: new HttpParams()
          .set('productId', productId.toString())
          .set('quantity', quantity.toString())
      }
    ).pipe(
      timeout(10000),
      retry(1),
      tap(cart => console.log('Updated cart item quantity:', productId, quantity, cart)),
      catchError(this.handleError)
    );
  }

  clearCart(userId: number | undefined | null): Observable<void> {
    const user = this.authService.getCurrentUser();
    userId = userId || user?.userId;
    
    if (!userId) {
      console.error('Cannot clear cart without a valid userId');
      return throwError(() => new Error('User ID is required'));
    }
    
    console.log(`Clearing cart for user ${userId}`);
    
    return this.http.delete<void>(`${this.apiUrl}/${userId}/clear`).pipe(
      timeout(10000),
      retry(1),
      tap(_ => console.log('Cleared cart for user:', userId)),
      catchError(this.handleError)
    );
  }

  calculateCartTotal(cartItems: CartItem[] | undefined | null): number {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    
    return cartItems.reduce((total, item) => {
      if (item && item.product && typeof item.product.price === 'number' && typeof item.quantity === 'number') {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  }

  getCartItemCount(cart: Cart | null): number {
    if (!cart || !cart.items || !Array.isArray(cart.items)) return 0;
    
    return cart.items.reduce((count, item) => {
      if (item && typeof item.quantity === 'number') {
        return count + item.quantity;
      }
      return count;
    }, 0);
  }
  
  private createEmptyCart(userId?: number): Cart {
    return {
      cartId: 0,
      userId: userId || 0,
      totalPrice: 0,
      items: []
    };
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
    
    // For cart operations, sometimes returning an empty cart is better than throwing an error
    // to keep the UI functioning
    return throwError(() => new Error(errorMessage));
  }
}