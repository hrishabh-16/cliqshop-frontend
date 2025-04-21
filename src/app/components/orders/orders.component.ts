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
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.checkAuth();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAuth(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }
    this.userId = user.userId;
  }

  loadOrders(page: number = 1): void {
    if (!this.userId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.currentPage = page;
    
    // Add retry logic to handle temporary connection issues
    const maxRetries = 3;
    let retryCount = 0;
    
    const attemptLoad = () => {
      const sub = this.orderService.getOrdersByUser(this.userId!, this.currentPage, this.pageSize)
        .subscribe({
          next: (response) => {
            this.orders = response.orders;
            this.totalOrders = response.totalItems;
            this.totalPages = Math.ceil(this.totalOrders / this.pageSize);
            this.isLoading = false;
            
            // Debug information
            console.log(`Loaded ${this.orders.length} orders. Total: ${this.totalOrders}, Pages: ${this.totalPages}`);
          },
          error: (error) => {
            console.error('Error loading orders:', error);
            
            // Retry logic for connection errors
            if (error.status === 0 && retryCount < maxRetries) {
              retryCount++;
              const timeout = retryCount * 1000; // Increasing backoff
              console.log(`Retrying in ${timeout}ms (${retryCount}/${maxRetries})...`);
              
              setTimeout(() => {
                attemptLoad();
              }, timeout);
              return;
            }
            
            this.toastr.error('Failed to load your orders. Please try again later.');
            this.isLoading = false;
            
            // If we have no connection, create dummy data for testing UI
            if (error.status === 0) {
              this.handleOfflineMode();
            }
          }
        });

      this.subscriptions.push(sub);
    };
    
    attemptLoad();
  }
  
  // If we're offline, show some mock data for UI testing
  private handleOfflineMode(): void {
    console.log('Using offline mode with mock data');
    // Only use this in development for testing UI
    this.orders = [];
    this.totalOrders = 0;
    this.totalPages = 0;
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

  getPaginationArray(): (number | string)[] {
    const result: (number | string)[] = [];
    
    if (this.totalPages <= 7) {
      for (let i = 1; i <= this.totalPages; i++) {
        result.push(i);
      }
    } else {
      // Always include first page
      result.push(1);
      
      // Calculate start and end of current window
      let startPage = Math.max(2, this.currentPage - 1);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      // Adjust to show 3 pages in the middle
      if (startPage > 2) {
        result.push('...');
      }
      
      // Add the window
      for (let i = startPage; i <= endPage; i++) {
        result.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < this.totalPages - 1) {
        result.push('...');
      }
      
      // Always include last page
      result.push(this.totalPages);
    }
    
    return result;
  }

  reorderItems(order: Order): void {
    if (!this.userId || !order.orderItems || order.orderItems.length === 0) {
      this.toastr.warning('Cannot reorder items at this time.');
      return;
    }

    this.isLoading = true;
    
    // First clear the cart
    const clearSub = this.cartService.clearCart(this.userId).subscribe({
      next: () => {
        let addedItems = 0;
        
        // Add each item to cart
        order.orderItems.forEach(item => {
          // Handle both cases: where product is an object or just a productId
          const productId = typeof item.product === 'object' ? item.product?.productId : item.productId;
          
          if (!productId) {
            return;
          }
          
          this.cartService.addToCart(this.userId!, productId, item.quantity).subscribe({
            next: () => {
              addedItems++;
              
              // When all items are added, navigate to cart
              if (addedItems === order.orderItems.length) {
                this.isLoading = false;
                this.toastr.success('All items have been added to your cart.');
                this.router.navigate(['/cart']);
              }
            },
            error: (error) => {
              console.error('Error adding item to cart:', error);
              this.isLoading = false;
              this.toastr.error('Failed to add some items to your cart.');
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
      return;
    }
    
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
        
        const cancelSub = this.orderService.cancelOrder(orderId, this.userId!).subscribe({
          next: () => {
            this.toastr.success('Your order has been cancelled successfully.');
            this.loadOrders(this.currentPage);
          },
          error: (error) => {
            console.error('Error cancelling order:', error);
            this.toastr.error('Failed to cancel your order. Please try again later.');
            this.isLoading = false;
          }
        });
        
        this.subscriptions.push(cancelSub);
      }
    });
  }
}