import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order/order.service';
import { Order } from '../../models/order.model';
import { Subscription, interval } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth.service';
import { CartService } from '../../services/cart/cart.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: false,
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.css']
})
export class OrderConfirmationComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  isLoading = true;
  private subscriptions: Subscription[] = [];
  private retryCount = 0;
  private maxRetries = 5; // Increased retries for better chance of getting data
  private userId: number | null = null;
  private orderId: number | null = null;
  billingEmail: string = ''; // For displaying email in the UI

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private cartService: CartService // Added cart service to clear cart
  ) { }

  ngOnInit(): void {
    console.log('Order confirmation component initialized');
    
    // Get user info
    const user = this.authService.getCurrentUser();
    if (user && user.userId) {
      this.userId = user.userId;
      this.billingEmail = user.email || '';
    }
    
    // Try to recover from local storage if we have a last order ID
    const lastOrderId = localStorage.getItem('lastOrderId');
    const lastOrderTime = localStorage.getItem('lastOrderTime');
    
    // Check for payment status in query params (returning from Stripe)
    this.route.queryParamMap.subscribe(queryParams => {
      const paymentStatus = queryParams.get('payment_status');
      const sessionId = localStorage.getItem('stripeSessionId');
      const orderId = queryParams.get('order_id');
      
      if (paymentStatus === 'success' && orderId) {
        this.orderId = Number(orderId);
        this.processSuccessfulPayment(Number(orderId), sessionId);
      } else {
        // If not returning from payment, load order normally
        this.route.paramMap.subscribe(params => {
          const routeOrderId = params.get('id');
          if (routeOrderId) {
            this.orderId = Number(routeOrderId);
            this.loadOrderWithRetries(Number(routeOrderId));
          } else {
            this.route.queryParamMap.subscribe(qParams => {
              const queryOrderId = qParams.get('orderId');
              if (queryOrderId) {
                this.orderId = Number(queryOrderId);
                this.loadOrderWithRetries(Number(queryOrderId));
              } else if (lastOrderId && lastOrderTime) {
                // Check if the last order was within the last 30 minutes
                const orderTime = new Date(lastOrderTime);
                const now = new Date();
                const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
                
                if (orderTime > thirtyMinutesAgo) {
                  console.log('Recovering from last order ID in local storage:', lastOrderId);
                  this.orderId = Number(lastOrderId);
                  this.loadOrderWithRetries(Number(lastOrderId));
                } else {
                  this.isLoading = false;
                  this.toastr.error('Order ID is missing');
                }
              } else {
                this.isLoading = false;
                this.toastr.error('Order ID is missing');
              }
            });
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Process successful payment after Stripe redirect
   */
  private processSuccessfulPayment(orderId: number, sessionId: string | null): void {
    this.isLoading = true;
    this.toastr.info('Confirming your payment...');
    
    // First update payment status to PAID
    const updateSub = this.orderService.updatePaymentStatus(orderId, 'PAID').subscribe({
      next: (updateResponse) => {
        console.log('Payment status updated:', updateResponse);
        
        // Clear user's cart
        if (this.userId) {
          this.cartService.clearCart(this.userId).subscribe({
            next: () => {
              console.log('Cart cleared successfully after payment');
              localStorage.removeItem('stripeSessionId');
              localStorage.removeItem('orderPaymentPending');
              
              // After successful payment status update and cart clear, load the order
              this.loadOrderWithRetries(orderId);
            },
            error: (cartError) => {
              console.error('Error clearing cart:', cartError);
              // Continue with order loading even if cart clearing fails
              this.loadOrderWithRetries(orderId);
            }
          });
        } else {
          // No user ID available, just load the order
          this.loadOrderWithRetries(orderId);
        }
      },
      error: (error) => {
        console.error('Error updating payment status:', error);
        // Even if update fails, still try to load the order
        this.loadOrderWithRetries(orderId);
      }
    });
    
    this.subscriptions.push(updateSub);
  }

  /**
   * Load order with exponential backoff retry strategy
   */
  loadOrderWithRetries(orderId: number): void {
    this.isLoading = true;
    this.retryCount = 0;
    this.loadOrderWithBackoff(orderId);
  }

  /**
   * Implements backoff retry strategy for loading order data
   */
  private loadOrderWithBackoff(orderId: number): void {
    console.log(`Attempt ${this.retryCount + 1}/${this.maxRetries} to load order ${orderId}`);
    
    const sub = this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        console.log('Order loaded successfully:', order);
        this.order = order;
        
        // If order doesn't have items or payment is pending, try to update and refresh
        if (!order.orderItems || order.orderItems.length === 0 || order.paymentStatus === 'PENDING') {
          console.log('Order missing items or payment pending, will retry');
          
          if (order.paymentStatus === 'PENDING') {
            // Force update payment status to PAID if we came from a successful payment
            const paymentStatus = this.route.snapshot.queryParamMap.get('payment_status');
            if (paymentStatus === 'success') {
              this.forceUpdatePaymentStatus(orderId);
              return;
            }
          }
          
          // Otherwise try again after a delay
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => this.loadOrderWithBackoff(orderId), 2000 * this.retryCount);
            return;
          }
        }
        
        this.isLoading = false;
        this.toastr.success('Order details loaded successfully!');
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.handleOrderLoadError(orderId, error);
      }
    });
    
    this.subscriptions.push(sub);
  }

  /**
   * Force update payment status to PAID
   */
  private forceUpdatePaymentStatus(orderId: number): void {
    this.orderService.updatePaymentStatus(orderId, 'PAID').subscribe({
      next: (updateResponse) => {
        console.log('Payment status force updated:', updateResponse);
        this.toastr.success('Payment confirmed!');
        
        // Reload order after forced update
        setTimeout(() => this.refreshOrderDetails(), 1000);
      },
      error: (error) => {
        console.error('Error forcing payment status update:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Handle errors when loading order
   */
  private handleOrderLoadError(orderId: number, error: any): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000); // Exponential backoff with max 10s
      
      this.toastr.info(`Retrying to load order details in ${delay/1000}s...`);
      
      setTimeout(() => {
        this.loadOrderWithBackoff(orderId);
      }, delay);
    } else {
      this.isLoading = false;
      this.toastr.error('Failed to load order details after multiple attempts.');
    }
  }

  /**
   * Manually refresh order details
   */
  refreshOrderDetails(): void {
    if (!this.orderId) {
      this.toastr.error('Cannot refresh - order ID is missing');
      return;
    }
    
    this.isLoading = true;
    console.log('Manually refreshing order details for order ID:', this.orderId);
    
    const sub = this.orderService.getOrderById(this.orderId).subscribe({
      next: (refreshedOrder) => {
        console.log('Refreshed order data:', refreshedOrder);
        this.order = refreshedOrder;
        
        // If payment is still pending but we came from successful payment, force update
        if (refreshedOrder.paymentStatus === 'PENDING') {
          const paymentStatus = this.route.snapshot.queryParamMap.get('payment_status');
          if (paymentStatus === 'success' && this.orderId !== null) {
            this.forceUpdatePaymentStatus(this.orderId);
            return;
          }
        }
        
        this.isLoading = false;
        
        if (!refreshedOrder.orderItems || refreshedOrder.orderItems.length === 0) {
          this.toastr.warning('Order items are still loading. Please try refreshing again in a moment.');
        } else {
          this.toastr.success('Order details refreshed successfully!');
        }
      },
      error: (error) => {
        console.error('Error refreshing order:', error);
        this.isLoading = false;
        this.toastr.error('Failed to refresh order details');
      }
    });
    
    this.subscriptions.push(sub);
  }

  printOrder(): void {
    window.print();
  }
  
  // Helper method to get safe numeric value
  safeNumber(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private checkAndFixPaymentStatus(): void {
    // If there's a failed payment status update recorded in localStorage, try to fix it
    const failedOrderId = localStorage.getItem('paymentStatusUpdateFailed');
    if (failedOrderId && this.orderId === Number(failedOrderId)) {
      console.log('Found record of failed payment status update, attempting to fix...');
      this.forceFixPaymentStatus(this.orderId);
      localStorage.removeItem('paymentStatusUpdateFailed');
    }
    
    // If we have an order with pending payment status but successful payment flag in URL
    if (this.order && this.order.paymentStatus === 'PENDING' && 
        this.route.snapshot.queryParamMap.get('payment_status') === 'success') {
      console.log('Order has PENDING status despite successful payment, fixing...');
      this.forceFixPaymentStatus(this.orderId!);
    }
  }
  
  /**
   * Force fix payment status using multiple methods
   * This is called when we detect that an order should have PAID status but it's still PENDING
   */
  private forceFixPaymentStatus(orderId: number): void {
    this.showLoadingOverlay('Updating payment status...');
    
    // First try the regular update method
    this.orderService.updatePaymentStatus(orderId, 'PAID').subscribe({
      next: (response) => {
        console.log('Successfully updated payment status:', response);
        this.hideLoadingOverlay();
        this.refreshOrderDetails();
      },
      error: (error) => {
        console.error('Error updating payment status:', error);
        
        // Try alternative method
        this.orderService.updatePaymentStatusAlternative(orderId, 'PAID').subscribe({
          next: (altResponse) => {
            console.log('Alternative payment status update successful:', altResponse);
            this.hideLoadingOverlay();
            this.refreshOrderDetails();
          },
          error: (altError) => {
            console.error('Alternative payment update failed:', altError);
            
            // Try force update
            this.orderService.forcePaymentStatusUpdate(orderId).subscribe({
              next: (forceResponse) => {
                console.log('Forced payment update successful:', forceResponse);
                this.hideLoadingOverlay();
                this.refreshOrderDetails();
              },
              error: (forceError) => {
                console.error('Forced payment update failed:', forceError);
                
                // Last resort: direct database update
                this.orderService.directDatabaseUpdate(orderId).subscribe({
                  next: (directResponse) => {
                    console.log('Direct database update successful:', directResponse);
                    this.hideLoadingOverlay();
                    this.refreshOrderDetails();
                  },
                  error: (directError) => {
                    console.error('All payment status update methods failed:', directError);
                    this.hideLoadingOverlay();
                    this.toastr.warning('Could not update payment status. Please contact support.');
                    
                    // Still try to refresh the order details
                    setTimeout(() => this.refreshOrderDetails(), 1000);
                  }
                });
              }
            });
          }
        });
      }
    });
  }
  
  /**
   * Show a loading overlay while updating payment status
   */
  private showLoadingOverlay(message: string = 'Loading...'): void {
    // Option 1: Use existing loading indicator
    this.isLoading = true;
    
    // // Option 2: Create a temporary overlay
    // const overlay = document.createElement('div');
    // overlay.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
    // overlay.id = 'payment-status-overlay';
    // overlay.innerHTML = `
    //   <div class="bg-white p-4 rounded-md shadow-lg text-center">
    //     <div class="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-2"></div>
    //     <p class="text-gray-800">${message}</p>
    //   </div>
    // `;
    // document.body.appendChild(overlay);
  }

  /**
 * Hide the loading overlay
 */
private hideLoadingOverlay(): void {
  // Option 1: Use existing loading indicator
  this.isLoading = false;
  
  // Option 2: Remove temporary overlay
  const overlay = document.getElementById('payment-status-overlay');
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}
}