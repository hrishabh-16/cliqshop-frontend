import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order/order.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { Order, OrderStatus } from '../../models/order.model';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  isLoading = true;
  currentPage = 1;
  pageSize = 5;
  totalOrders = 0;
  totalPages = 0;
  private userId: number | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private orderService: OrderService,
    private cartService: CartService,
    private authService: AuthService,
    public router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    console.log('Orders component initialized');
    this.checkAuth();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAuth(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      console.log('User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }
    this.userId = user.userId;
    console.log('Authenticated user ID:', this.userId);
  }

  loadOrders(page: number = 1): void {
    if (!this.userId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.currentPage = page;
    
    console.log(`Loading orders for user ${this.userId}, page ${page}, size ${this.pageSize}`);
    
    // Add retry logic to handle temporary connection issues
    const maxRetries = 3;
    let retryCount = 0;
    
    const attemptLoad = () => {
      const sub = this.orderService.getOrdersByUser(this.userId!, this.currentPage, this.pageSize)
        .subscribe({
          next: (response) => {
            console.log('Orders response:', response);
            this.orders = response.orders || [];
            this.totalOrders = response.totalItems || 0;
            this.totalPages = Math.ceil(this.totalOrders / this.pageSize) || 1;
            this.isLoading = false;
            
            // Debug information
            console.log(`Loaded ${this.orders.length} orders. Total: ${this.totalOrders}, Pages: ${this.totalPages}`);
            
            // Log order details for debugging
            this.orders.forEach((order, index) => {
              console.log(`Order ${index + 1}:`, order);
              console.log(`  Status: ${order.orderStatus || 'unknown'}`);
              console.log(`  Total: ${order.orderTotal || order.totalPrice || 0}`);
              console.log(`  Items: ${order.orderItems?.length || 0}`);
            });
            
            // If orders array is empty but we have totalItems, try again
            if (this.orders.length === 0 && this.totalOrders > 0 && retryCount < maxRetries) {
              retryCount++;
              this.toastr.info(`Loading orders... Attempt ${retryCount}/${maxRetries}`);
              setTimeout(() => {
                console.log(`Empty orders array but totalItems > 0. Retrying (${retryCount}/${maxRetries})...`);
                attemptLoad();
              }, retryCount * 1000);
              return;
            }
            
            // After loading orders, check if any need payment status updates
            this.checkOrdersPaymentStatus();
            
            if (this.orders.length === 0) {
              this.toastr.info('You have no orders yet');
            }
          },
          error: (error) => {
            console.error('Error loading orders:', error);
            
            // Retry logic for connection errors
            if ((error.status === 0 || error.status === 500) && retryCount < maxRetries) {
              retryCount++;
              const timeout = retryCount * 1000; // Increasing backoff
              this.toastr.warning(`Connection issue. Retrying... (${retryCount}/${maxRetries})`);
              console.log(`Retrying in ${timeout}ms (${retryCount}/${maxRetries})...`);
              
              setTimeout(() => {
                attemptLoad();
              }, timeout);
              return;
            }
            
            this.toastr.error('Failed to load your orders. Please try again later.');
            this.isLoading = false;
          }
        });

      this.subscriptions.push(sub);
    };
    
    attemptLoad();
  }
  
  /**
   * Check and update payment status for orders that are in pending state
   */
  checkOrdersPaymentStatus(): void {
    if (!this.orders || this.orders.length === 0) return;
    
    // Find orders with pending payment status and card payment method
    const pendingOrders = this.orders.filter(order => 
      order.paymentStatus === 'PENDING' && 
      order.paymentMethod === 'card'
    );
    
    if (pendingOrders.length === 0) return;
    
    console.log(`Found ${pendingOrders.length} orders with pending payment status to check`);
    
    // Check payment status for each pending order
    pendingOrders.forEach(order => {
      if (!order.orderId) return;
      
      const sub = this.orderService.checkPaymentStatus(order.orderId).subscribe({
        next: (response) => {
          console.log(`Payment status check for order ${order.orderId}:`, response);
          
          if (response && response.paymentStatus === 'PAID') {
            // Update the order in our local array
            const orderIndex = this.orders.findIndex(o => o.orderId === order.orderId);
            if (orderIndex >= 0) {
              this.orders[orderIndex].paymentStatus = 'PAID';
              this.toastr.success(`Payment confirmed for order #${order.orderId}`);
              
              // Refresh order items if missing
              if (!this.orders[orderIndex].orderItems || this.orders[orderIndex].orderItems.length === 0) {
                this.refreshOrderDetails(order.orderId);
              }
            }
          }
        },
        error: (error) => {
          console.error(`Error checking payment status for order ${order.orderId}:`, error);
        }
      });
      
      this.subscriptions.push(sub);
    });
  }
  
  /**
   * Refresh order details for a specific order
   */
  refreshOrderDetails(orderId: number): void {
    if (!orderId) return;
    
    console.log(`Refreshing details for order ${orderId}`);
    
    const sub = this.orderService.getOrderById(orderId).subscribe({
      next: (refreshedOrder) => {
        console.log(`Refreshed order ${orderId} data:`, refreshedOrder);
        
        // Find and update the order in our local array
        const orderIndex = this.orders.findIndex(o => o.orderId === orderId);
        if (orderIndex >= 0) {
          this.orders[orderIndex] = refreshedOrder;
          this.toastr.success(`Order #${orderId} details refreshed`);
        }
      },
      error: (error) => {
        console.error(`Error refreshing order ${orderId}:`, error);
        this.toastr.error(`Failed to refresh order #${orderId} details`);
      }
    });
    
    this.subscriptions.push(sub);
  }
  
  getPageNumbers(): number[] {
    const result: number[] = [];
    
    if (this.totalPages <= 7) {
      for (let i = 1; i <= this.totalPages; i++) {
        result.push(i);
      }
    } else {
      // Always include first page
      result.push(1);
      
      // Calculate window around current page
      let startPage = Math.max(2, this.currentPage - 1);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      // Add the window
      for (let i = startPage; i <= endPage; i++) {
        result.push(i);
      }
      
      // Always include last page
      result.push(this.totalPages);
    }
    
    return result;
  }
  
  goToPage(page: number): void {
    // Bug fix: Corrected condition
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.loadOrders(page);
  }

  reorderItems(order: Order): void {
    if (!this.userId) {
      this.toastr.warning('You must be logged in to reorder items.');
      return;
    }
    
    const items = order.orderItems || [];
    
    if (!items || items.length === 0) {
      this.toastr.warning('Cannot reorder items at this time.');
      return;
    }

    this.isLoading = true;
    this.toastr.info('Preparing to reorder items...');
    
    // First clear the cart
    const clearSub = this.cartService.clearCart(this.userId).subscribe({
      next: () => {
        console.log('Cart cleared successfully');
        let addedItems = 0;
        const totalItems = items.length;
        
        if (totalItems === 0) {
          this.isLoading = false;
          this.toastr.error('No valid items to add to cart');
          return;
        }
        
        // Add each item to cart
        items.forEach(item => {
          // Handle both cases: where product is an object or just a productId
          const productId = item.product?.productId || item.productId;
          
          if (!productId) {
            console.warn('Skipping item without product ID:', item);
            // Count skipped items as "added" to maintain progress count
            addedItems++;
            
            // Check if we're done (even with skips)
            if (addedItems === totalItems) {
              this.isLoading = false;
              if (addedItems > 0) {
                this.toastr.success('Items have been added to your cart.');
                this.router.navigate(['/cart']);
              } else {
                this.toastr.error('Could not add any items to cart');
              }
            }
            return;
          }
          
          const quantity = item.quantity || 1;
          console.log(`Adding product ${productId} with quantity ${quantity} to cart`);
          
          this.cartService.addToCart(this.userId!, productId, quantity).subscribe({
            next: (response) => {
              console.log(`Added item ${productId} to cart:`, response);
              addedItems++;
              
              // When all items are added, navigate to cart
              if (addedItems === totalItems) {
                this.isLoading = false;
                this.toastr.success('All items have been added to your cart.');
                this.router.navigate(['/cart']);
              }
            },
            error: (error) => {
              console.error(`Error adding item ${productId} to cart:`, error);
              addedItems++;
              
              // If this was the last item, proceed to cart anyway
              if (addedItems === totalItems) {
                this.isLoading = false;
                this.toastr.warning('Some items could not be added to your cart.');
                if (addedItems > totalItems / 2) {
                  // If more than half the items were added successfully, go to cart
                  this.router.navigate(['/cart']);
                }
              }
            }
          });
        });
      },
      error: (error) => {
        console.error('Error clearing cart:', error);
        this.isLoading = false;
        this.toastr.error('Failed to prepare your cart for reordering.');
      }
    });
    
    this.subscriptions.push(clearSub);
  }

  cancelOrder(orderId: number): void {
    if (!this.userId) {
      this.toastr.error('You must be logged in to cancel an order');
      return;
    }
    
    console.log(`Attempting to cancel order ${orderId} for user ${this.userId}`);
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order? This action cannot be undone.',
        confirmText: 'Yes, Cancel Order',
        cancelText: 'No, Keep Order'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.toastr.info('Processing your cancellation request...');
        
        const cancelSub = this.orderService.cancelOrder(orderId, this.userId!).subscribe({
          next: (response) => {
            console.log('Order cancelled successfully:', response);
            this.toastr.success('Your order has been cancelled successfully.');
            
            // Update the local order status without reloading everything
            const orderIndex = this.orders.findIndex(o => o.orderId === orderId);
            if (orderIndex >= 0) {
              this.orders[orderIndex].orderStatus = 'CANCELLED';
              
              // Also update payment status if it was pending
              if (this.orders[orderIndex].paymentStatus === 'PENDING') {
                this.orders[orderIndex].paymentStatus = 'FAILED';
              }
            } else {
              // If we can't find the order for some reason, reload all orders
              this.loadOrders(this.currentPage);
            }
            
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error cancelling order:', error);
            
            // Try to provide more specific error messages
            if (error.status === 400) {
              this.toastr.error('This order cannot be cancelled. It may already be processed or shipped.');
            } else if (error.status === 404) {
              this.toastr.error('Order not found. It may have been already cancelled or removed.');
            } else {
              this.toastr.error('Failed to cancel your order. Please try again later or contact customer support.');
            }
            
            this.isLoading = false;
          }
        });
        
        this.subscriptions.push(cancelSub);
      }
    });
  }
  
  // Helper method to calculate subtotal for the order
  calculateSubtotal(order: Order): number {
    // First check if subtotal is directly available
    if (order.subtotal) {
      return order.subtotal;
    }
    
    // Calculate from items if available
    const items = order.orderItems || [];
    if (items && items.length > 0) {
      return items.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
      }, 0);
    }
    
    // Last resort: if orderTotal is available, use approximate calculation
    if (order.orderTotal || order.totalPrice) {
      const total = order.orderTotal || order.totalPrice || 0;
      // Reverse calculate: assume tax is ~18% and shipping is negligible
      return total / 1.18;
    }
    
    return 0;
  }
  
  // Helper method to calculate tax for the order
  calculateTax(order: Order): number {
    // First check if tax is directly available
    if (order.tax) {
      return order.tax;
    }
    
    // Approximate tax as 18% of subtotal
    const subtotal = this.calculateSubtotal(order);
    return subtotal * 0.18;
  }
}