import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order/order.service';
import { Order } from '../../models/order.model';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth.service';

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
  private maxRetries = 3;

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('Order confirmation component initialized');
    
    // Try to recover from local storage if we have a last order ID
    const lastOrderId = localStorage.getItem('lastOrderId');
    const lastOrderTime = localStorage.getItem('lastOrderTime');
    
    // Get order ID from route params or query params
    this.route.paramMap.subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.loadOrder(Number(orderId));
      } else {
        this.route.queryParamMap.subscribe(queryParams => {
          const queryOrderId = queryParams.get('orderId');
          if (queryOrderId) {
            this.loadOrder(Number(queryOrderId));
          } else if (lastOrderId && lastOrderTime) {
            // Check if the last order was within the last 10 minutes
            const orderTime = new Date(lastOrderTime);
            const now = new Date();
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            
            if (orderTime > tenMinutesAgo) {
              console.log('Recovering from last order ID in local storage:', lastOrderId);
              this.loadOrder(Number(lastOrderId));
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

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadOrder(orderId: number): void {
    this.isLoading = true;
    console.log(`Loading order details for order ID: ${orderId}`);
    
    // Check if user is authenticated
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      console.warn('User not authenticated, redirecting to login');
      this.toastr.error('Authentication required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    
    const sub = this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        console.log('Order loaded successfully:', order);
        this.order = order;
        this.isLoading = false;
        
        // Store order ID and time in local storage for recovery
        localStorage.setItem('lastOrderId', orderId.toString());
        localStorage.setItem('lastOrderTime', new Date().toISOString());
        
        // Validate order data - we need at least some basic information
        if (!order || !order.orderId) {
          console.warn('Order data is incomplete or empty:', order);
          
          // If order data is missing crucial information, try reloading
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.toastr.info(`Loading order details... Attempt ${this.retryCount}/${this.maxRetries}`);
            setTimeout(() => {
              console.log(`Retrying order load (${this.retryCount}/${this.maxRetries})...`);
              this.loadOrder(orderId);
            }, 1000 * this.retryCount); // Increasing backoff
            return;
          } else {
            this.toastr.warning('Some order details may be incomplete');
          }
        } else {
          this.toastr.success('Order details loaded successfully!');
        }
      },
      error: (error) => {
        console.error('Error loading order:', error);
        
        // Implement retry logic for network errors
        if ((error.status === 0 || error.status === 500) && this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => {
            console.log(`Retrying due to error (${this.retryCount}/${this.maxRetries})...`);
            this.loadOrder(orderId);
          }, 1000 * this.retryCount);
          return;
        }
        
        this.isLoading = false;
        this.toastr.error('Failed to load order details. Please try again later.');
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
}