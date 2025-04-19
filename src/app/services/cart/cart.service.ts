import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CartItem {
  cartItemId: number;
  quantity: number;
  product: any;
  price: number;
}

export interface Cart {
  cartId: number;
  totalPrice: number;
  cartItems: CartItem[];
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:9000/api/cart';

  constructor(private http: HttpClient) { }

  // Get cart by user ID
  getCartByUserId(userId: number): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/${userId}`);
  }

  // Add item to cart
  addToCart(userId: number, productId: number, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(
      `${this.apiUrl}/${userId}/add?productId=${productId}&quantity=${quantity}`, 
      {}
    );
  }

  // Remove item from cart
  removeCartItem(userId: number, productId: number): Observable<Cart> {
    return this.http.delete<Cart>(
      `${this.apiUrl}/${userId}/remove?productId=${productId}`
    );
  }

  // Update cart item quantity
  updateCartItemQuantity(userId: number, productId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(
      `${this.apiUrl}/${userId}/update?productId=${productId}&quantity=${quantity}`,
      {}
    );
  }

  // Clear cart
  clearCart(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/clear`);
  }

  // Calculate cart totals
  calculateCartTotal(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }
}