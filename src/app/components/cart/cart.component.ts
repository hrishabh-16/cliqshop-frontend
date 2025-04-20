import { Component, OnInit, HostListener, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { Cart, normalizeCart } from '../../models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  isLoading: boolean = true;
  showScrollTop: boolean = false;
  
  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadCart();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadCart(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      console.error('No user found in localStorage');
      this.isLoading = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }
    
    if (!user.userId) {
      console.error('User found but userId is missing:', user);
      this.isLoading = false;
      // Create an empty cart for display
      this.cart = {
        cartId: 0,
        userId: 0,
        totalPrice: 0,
        items: []
      };
      return;
    }
    
    // Ensure we're using the correct user ID
    const userId = user.userId;
    console.log('Fetching cart for user ID:', userId);
    
    this.cartService.getCartByUserId(userId).subscribe({
      next: (cart) => {
        console.log('Cart data loaded:', cart);
        this.ngZone.run(() => {
          this.cart = cart;
          this.isLoading = false;
          
          // If cart is null or has no items, initialize an empty cart object
          if (!this.cart) {
            this.cart = {
              cartId: 0,
              userId: userId,
              totalPrice: 0,
              items: []
            };
          }
        });
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          // Initialize empty cart on error
          this.cart = {
            cartId: 0,
            userId: userId,
            totalPrice: 0,
            items: []
          };
          this.showNotification('Failed to load cart. Please try again later.', 'error');
        });
      }
    });
  }

  getProductProperty(item: any, property: string, fallback: any = undefined): any {
    // First check if item has a product object with the property
    if (item.product && typeof item.product[property] !== 'undefined') {
      return item.product[property];
    }
    
    // Next check direct property on the item with 'product' prefix
    const productPropName = `product${property.charAt(0).toUpperCase() + property.slice(1)}`;
    if (typeof item[productPropName] !== 'undefined') {
      return item[productPropName];
    }
    
    // Finally, check direct property match
    if (typeof item[property] !== 'undefined') {
      return item[property];
    }
    
    // Return fallback if nothing found
    return fallback;
  }

  increaseQuantity(productId: number): void {
    if (!this.cart) return;
    
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      this.showNotification('You need to be logged in to update your cart.', 'error');
      return;
    }
    
    const cartItem = this.cart.items.find(item => 
      this.getProductProperty(item, 'productId') === productId);
    
    if (!cartItem) {
      console.error('Cart item not found for product ID:', productId);
      return;
    }
    
    // Check stock availability - if available
    const stockQuantity = this.getProductProperty(cartItem, 'stockQuantity');
    if (stockQuantity !== undefined && cartItem.quantity >= stockQuantity) {
      this.showNotification('Cannot add more items. Maximum stock reached.', 'error');
      return;
    }
    
    // Show loading state
    this.isLoading = true;
    
    // Optimistically update the UI first
    const updatedQuantity = cartItem.quantity + 1;
    cartItem.quantity = updatedQuantity;
    
    console.log(`Increasing quantity for product ${productId} to ${updatedQuantity}`);
    
    this.cartService.updateCartItemQuantity(user.userId, productId, updatedQuantity).subscribe({
      next: (updatedCart) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          if (updatedCart) {
            console.log('Successfully updated cart:', updatedCart);
            this.cart = updatedCart;
            this.showNotification('Cart updated successfully.', 'success');
          } else {
            console.warn('Cart update returned null, reloading cart data');
            this.loadCart(); // Reload cart if we get a null response
          }
        });
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          // Revert the optimistic update
          if (cartItem) {
            cartItem.quantity = cartItem.quantity - 1;
          }
          this.showNotification('Error updating quantity. Please try again.', 'error');
          this.loadCart(); // Reload cart to ensure consistency
        });
      }
    });
  }

  decreaseQuantity(productId: number): void {
    if (!this.cart) return;
    
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      this.showNotification('You need to be logged in to update your cart.', 'error');
      return;
    }
    
    const cartItem = this.cart.items.find(item => 
      this.getProductProperty(item, 'productId') === productId);
    
    if (!cartItem || cartItem.quantity <= 1) {
      console.error('Cannot decrease quantity: item not found or already at minimum');
      return;
    }
    
    // Show loading state
    this.isLoading = true;
    
    // Optimistically update the UI first
    const updatedQuantity = cartItem.quantity - 1;
    cartItem.quantity = updatedQuantity;
    
    console.log(`Decreasing quantity for product ${productId} to ${updatedQuantity}`);
    
    this.cartService.updateCartItemQuantity(user.userId, productId, updatedQuantity).subscribe({
      next: (updatedCart) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          if (updatedCart) {
            console.log('Successfully updated cart:', updatedCart);
            this.cart = updatedCart;
            this.showNotification('Cart updated successfully.', 'success');
          } else {
            console.warn('Cart update returned null, reloading cart data');
            this.loadCart(); // Reload cart if we get a null response
          }
        });
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          // Revert the optimistic update
          if (cartItem) {
            cartItem.quantity = cartItem.quantity + 1;
          }
          this.showNotification('Error updating quantity. Please try again.', 'error');
          this.loadCart(); // Reload cart to ensure consistency
        });
      }
    });
  }

  removeItem(productId: number): void {
    if (!this.cart) return;
    
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      this.showNotification('You need to be logged in to update your cart.', 'error');
      return;
    }
    
    // Show confirmation dialog
    if (confirm('Are you sure you want to remove this item from your cart?')) {
      // Show loading state
      this.isLoading = true;
      
      // Optimistically update the UI by removing the item
      const itemIndex = this.cart.items.findIndex(item => 
        this.getProductProperty(item, 'productId') === productId);
      
      if (itemIndex !== -1) {
        const removedItem = this.cart.items.splice(itemIndex, 1)[0];
        // Update total price
        const itemPrice = this.getProductProperty(removedItem, 'price') || 0;
        this.cart.totalPrice -= (itemPrice * removedItem.quantity);
      }
      
      console.log(`Removing product ${productId} from cart`);
      
      this.cartService.removeCartItem(user.userId, productId).subscribe({
        next: (updatedCart) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            if (updatedCart) {
              console.log('Successfully updated cart after removal:', updatedCart);
              this.cart = updatedCart;
              this.showNotification('Item removed from cart.', 'success');
            } else {
              console.warn('Cart update after removal returned null, reloading cart data');
              this.loadCart(); // Reload cart if we get a null response
            }
          });
        },
        error: (error) => {
          console.error('Error removing item:', error);
          this.ngZone.run(() => {
            this.isLoading = false;
            this.showNotification('Error removing item. Please try again.', 'error');
            this.loadCart(); // Reload cart to restore consistency
          });
        }
      });
    }
  }

  clearCart(): void {
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) return;
    
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      this.showNotification('You need to be logged in to update your cart.', 'error');
      return;
    }
    
    // Show confirmation dialog
    if (confirm('Are you sure you want to clear your entire cart?')) {
      // Show loading state
      this.isLoading = true;
      
      console.log(`Clearing cart for user ${user.userId}`);
      
      this.cartService.clearCart(user.userId).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.cart = {
              cartId: 0,
              userId: user.userId,
              totalPrice: 0,
              items: []
            };
            this.isLoading = false;
            this.showNotification('Cart cleared successfully.', 'success');
          });
        },
        error: (error) => {
          console.error('Error clearing cart:', error);
          this.ngZone.run(() => {
            this.isLoading = false;
            this.showNotification('Error clearing cart. Please try again.', 'error');
            this.loadCart(); // Reload cart to restore consistency
          });
        }
      });
    }
  }

  getTotalItems(): number {
    if (!this.cart || !this.cart.items) return 0;
    
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  getShippingCost(): string {
    if (!this.cart || !this.cart.items) return '₹0.00';
    
    // Free shipping on orders over ₹999
    return this.cart.totalPrice >= 999 ? 'Free' : '₹99.00';
  }

  calculateTax(): number {
    if (!this.cart || !this.cart.items) return 0;
    
    // Calculate 18% GST
    return this.cart.totalPrice * 0.18;
  }

  calculateTotal(): number {
    if (!this.cart || !this.cart.items) return 0;
    
    const subtotal = this.cart.totalPrice;
    const tax = this.calculateTax();
    const shipping = this.getShippingCost() === 'Free' ? 0 : 99;
    
    // Calculate total
    return subtotal + tax + shipping;
  }

  checkout(): void {
    // Navigate to checkout page
    this.router.navigate(['/checkout']);
  }

  // Helper method to show a notification
  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-rose-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    notification.style.zIndex = '9999';  // Ensure it's visible above other elements
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}