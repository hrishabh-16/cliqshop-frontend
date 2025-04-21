import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap, retry, timeout, map } from 'rxjs/operators';
import { Cart, CartItem, normalizeCart } from '../../models/cart.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:9000/api/cart';
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  private cachedCart: Cart | null = null;

  public cart$ = this.cartSubject.asObservable();
  
  constructor(
    private http: HttpClient, 
    private authService: AuthService
  ) { }

  /**
   * Get cart by user ID
   * @param userId User ID
   * @returns Observable of Cart
   */
  getCartByUserId(userId: number | undefined | null): Observable<Cart | null> {
    if (!userId) {
      const user = this.authService.getCurrentUser();
      userId = user?.userId;
      
      if (!userId) {
        console.error('No valid userId available');
        const emptyCart = this.createEmptyCart();
        this.cartSubject.next(emptyCart);
        return of(emptyCart);
      }
    }
    
    // If we have a cached cart for this user, return it immediately
    if (this.cachedCart && this.cachedCart.userId === userId) {
      this.cartSubject.next(this.cachedCart);
      return of(this.cachedCart);
    }
    
    console.log(`Fetching cart for user ID: ${userId}`);
    
    return this.http.get<Cart>(`${this.apiUrl}/${userId}`).pipe(
      timeout(10000), // Set timeout to 10 seconds
      retry(2), // Retry twice if the request fails
      map(cart => normalizeCart(cart)), // Normalize the cart data structure
      tap(cart => {
        console.log(`Fetched cart for user: ${userId}`, cart);
        this.cachedCart = cart;
        this.cartSubject.next(cart);
      }),
      catchError(error => {
        console.error(`getCartByUserId failed:`, error);
        const emptyCart = this.createEmptyCart(userId);
        this.cartSubject.next(emptyCart);
        return of(emptyCart);
      })
    );
  }

  /**
   * Add item to cart
   * @param userId User ID
   * @param productId Product ID
   * @param quantity Quantity
   * @returns Observable of Cart
   */
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
      map(cart => normalizeCart(cart)), // Normalize the cart data structure
      tap(cart => {
        console.log('Added item to cart:', productId, quantity, cart);
        this.cachedCart = cart;
        this.cartSubject.next(cart);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Remove item from cart
   * @param userId User ID
   * @param productId Product ID
   * @returns Observable of Cart
   */
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
      map(cart => normalizeCart(cart)), // Normalize the cart data structure
      tap(cart => {
        console.log('Removed item from cart:', productId, cart);
        this.cachedCart = cart;
        this.cartSubject.next(cart);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update cart item quantity
   * @param userId User ID
   * @param productId Product ID
   * @param quantity New quantity
   * @returns Observable of Cart
   */
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
      map(cart => normalizeCart(cart)), // Normalize the cart data structure
      tap(cart => {
        console.log('Updated cart item quantity:', productId, quantity, cart);
        this.cachedCart = cart;
        this.cartSubject.next(cart);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Clear cart (remove all items)
   * @param userId User ID
   * @returns Observable of void
   */
  clearCart(userId: number | undefined | null): Observable<void> {
    const user = this.authService.getCurrentUser();
    userId = userId || user?.userId;
    
    if (!userId) {
      console.error('Cannot clear cart without a valid userId');
      return throwError(() => new Error('User ID is required'));
    }
    
    console.log(`Clearing cart for user ${userId}`);
    
    return this.http.delete<void>(`${this.apiUrl}/${userId}/clear`).pipe(
      timeout(15000), // Longer timeout for this critical operation
      retry(3), // More retries for this important operation
      tap(_ => {
        console.log('Cleared cart for user:', userId);
        
        // Update the cached cart to be empty
        if (this.cachedCart && this.cachedCart.userId === userId) {
          this.cachedCart = this.createEmptyCart(userId);
          this.cartSubject.next(this.cachedCart);
        }
      }),
      catchError((error) => {
        console.error('Error clearing cart:', error);
        
        // Even if the backend call fails, still update the local cart state to empty
        // This ensures the UI shows an empty cart even if the backend call fails
        const emptyCart = this.createEmptyCart(userId);
        this.cachedCart = emptyCart;
        this.cartSubject.next(emptyCart);
        
        // For UI purposes, we'll treat this as a success
        // But log the error for debugging
        console.warn('Backend failed to clear cart, but UI is updated');
        return of(void 0);
      })
    );
  }

  /**
   * Calculate total price of items in cart
   * @param cartItems Cart items
   * @returns Total price
   */
  calculateCartTotal(cartItems: CartItem[] | undefined | null): number {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    
    return cartItems.reduce((total, item) => {
      // Handle both structures: item with product object or item with direct properties
      const price = item.product?.price || item.productPrice || 0;
      return total + (price * (item.quantity || 0));
    }, 0);
  }

  /**
   * Get total number of items in cart
   * @param cart Cart
   * @returns Number of items
   */
  getCartItemCount(cart: Cart | null): number {
    if (!cart || !cart.items || !Array.isArray(cart.items)) return 0;
    
    return cart.items.reduce((count, item) => {
      if (item && typeof item.quantity === 'number') {
        return count + item.quantity;
      }
      return count;
    }, 0);
  }
  
  /**
   * Create an empty cart object
   * @param userId User ID (optional)
   * @returns Empty cart
   */
  private createEmptyCart(userId?: number): Cart {
    return {
      cartId: 0,
      userId: userId || 0,
      totalPrice: 0,
      items: []
    };
  }
  
  /**
   * Handle HTTP errors
   * @param error HTTP error
   * @returns Observable with error
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Network error
      errorMessage = 'Could not connect to server. Please check your internet connection.';
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
    
    // For cart operations, sometimes returning an empty cart is better than throwing an error
    // to keep the UI functioning
    return throwError(() => new Error(errorMessage));
  }
}