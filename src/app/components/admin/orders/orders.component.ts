import { Component, OnInit } from '@angular/core';
import { AdminOrderService } from '../../../services/admin/order/order.service';
import { Order, OrderStatus } from '../../../models/order.model';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../../services/user/user.service';
import { finalize, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { User, UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-admin-orders',
  standalone:false,
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  // Make Math available in the template
  public Math = Math;
  
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = true;
  currentStatus: string = 'ALL';
  searchTerm: string = '';
  // Add this to your component class
selectedStatus: string = '';
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalOrders = 0;
  totalPages = 1;
  pageNumbers: number[] = [];
  
  orderStatuses = [
    { value: 'ALL', label: 'All Orders' },
    { value: OrderStatus.PENDING, label: 'Pending' },
    { value: OrderStatus.PROCESSING, label: 'Processing' },
    { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: OrderStatus.SHIPPED, label: 'Shipped' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' }
  ];

  constructor(
    private orderService: AdminOrderService,
    private userService: UserService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Check if a specific status filter was passed through the route
    this.route.data.subscribe(data => {
      if (data['status']) {
        this.currentStatus = data['status'];
      }
    });
    
    // Get total order count for pagination
    this.orderService.getOrdersCount().subscribe({
      next: (count) => {
        this.totalOrders = count;
        this.calculatePagination();
      },
      error: (error) => {
        console.error('Error fetching order count:', error);
        // Set a default value to avoid pagination errors
        this.totalOrders = 0;
        this.calculatePagination();
      }
    });
    
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    
    // First get the total count of orders
    this.orderService.getOrdersCount().subscribe({
      next: (count) => {
        this.totalOrders = count;
        this.calculatePagination();
        
        // Then fetch the paginated orders
        this.orderService.getAllOrders(this.currentPage, this.itemsPerPage).subscribe({
          next: (data) => {
            this.orders = data.map(order => {
              if (!order.orderItems) {
                order.orderItems = [];
              }
              return order;
            });
            
            this.filterOrders();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading orders', error);
            this.toastr.error('Could not load orders', 'Error');
            this.loading = false;
            this.orders = [];
            this.filteredOrders = [];
          }
        });
      },
      error: (error) => {
        console.error('Error getting order count', error);
        this.toastr.error('Could not load order count', 'Error');
        this.loading = false;
      }
    });
  }
  

  filterOrders(): void {
    console.log('Filtering orders. Current status:', this.currentStatus);
    console.log('Total orders before filtering:', this.orders.length);
    
    if (this.currentStatus === 'ALL') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(order => 
        order.orderStatus === this.currentStatus
      );
    }

    console.log('Filtered orders after status filtering:', this.filteredOrders.length);

    // Apply search filter if search term exists
    if (this.searchTerm && this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      this.filteredOrders = this.filteredOrders.filter(order => 
        order.orderId.toString().includes(search) ||
        (order.customer?.name?.toLowerCase().includes(search) || false) ||
        order.orderTotal.toString().includes(search)
      );
      console.log('Filtered orders after search:', this.filteredOrders.length);
    }
  }

  filterByStatus(status: string): void {
    this.currentStatus = status;
    this.currentPage = 1; // Reset to first page when changing filters
    
    if (status !== 'ALL') {
      this.loading = true;
      this.orderService.getOrdersByStatus(status as OrderStatus, this.currentPage, this.itemsPerPage)
        .subscribe({
          next: (data) => {
            this.orders = data.map(order => {
              if (!order.orderItems) {
                order.orderItems = [];
              }
              return order;
            });
            
            // Get count for this status
            this.orderService.getOrdersCountByStatus(status as OrderStatus).subscribe(count => {
              this.totalOrders = count;
              this.calculatePagination();
              this.filteredOrders = [...this.orders];
              this.loading = false;
            });
          },
          error: (error) => {
            console.error(`Error loading orders with status ${status}:`, error);
            this.toastr.error('Could not load filtered orders', 'Error');
            this.orders = [];
            this.filteredOrders = [];
            this.loading = false;
          }
        });
    } else {
      this.loadOrders();
    }
  }
  

  search(): void {
    console.log('Search triggered with term:', this.searchTerm);
    this.filterOrders();
  }

  clearSearch(): void {
    console.log('Search cleared');
    this.searchTerm = '';
    this.filterOrders();
  }

  selectOrder(order: Order): void {
    console.log('Order selected, fetching full details:', order.orderId);
    this.loading = true;
    
    // First get the order details
    this.orderService.getOrderById(order.orderId).pipe(
      switchMap(orderDetails => {
        if (!orderDetails) {
          // If no details returned, use the order from the list
          console.log('Using order from list as detailed fetch failed');
          return of(order as Order);
        }
        
        // Process the order data to ensure all required fields exist
        orderDetails = this.orderService.processOrderData(orderDetails);
        
        // Then get user data
        return this.userService.getUserById(order.userId).pipe(
          map(user => {
            if (user) {
              orderDetails.customer = {
                ...user,
                name: user.name || user.username || `User #${user.userId}`,
                email: user.email || 'N/A'
              };
            } else {
              // Fallback customer info
              orderDetails.customer = {
                userId: order.userId,
                username: `user${order.userId}`,
                name: `User #${order.userId}`,
                email: 'N/A',
                role: UserRole.USER,
                enabled: true,
                createdAt: new Date().toISOString()
              };
            }
            return orderDetails as Order;
          }),
          catchError(userError => {
            console.error('Error fetching user data:', userError);
            // Use fallback customer info if user fetch fails
            orderDetails.customer = {
              userId: order.userId,
              username: `user${order.userId}`,
              name: `User #${order.userId}`,
              email: 'N/A',
              role: UserRole.USER,
              enabled: true,
              createdAt: new Date().toISOString()
            };
            return of(orderDetails as Order);
          })
        );
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (orderDetails: Order) => {
        this.selectedOrder = orderDetails;
        
        // Ensure orderItems exists and has product data
        if (!this.selectedOrder.orderItems) {
          this.selectedOrder.orderItems = [];
        }
        
        console.log('Order details loaded:', this.selectedOrder);
      },
      error: (error) => {
        console.error('Error fetching order details:', error);
        this.toastr.error('Could not load order details', 'Error');
      }
    });
  }

  closeOrderDetails(): void {
    console.log('Order details closed');
    this.selectedOrder = null;
  }

  updateOrderStatus(orderId: number, statusValue: string): void {
    if (!statusValue) {
      this.toastr.warning('Please select a status to update', 'No Status Selected');
      return;
    }
  
    console.log(`Updating order ${orderId} status to ${statusValue}`);
    
    const status = statusValue as OrderStatus;
    
    this.toastr.info(`Updating order status to ${status}...`, 'Processing', {
      timeOut: 0,  // Show until manually cleared
      disableTimeOut: true
    });
    const toastRef = this.toastr.info(`Updating order status to ${status}...`, 'Processing', {
      disableTimeOut: true
    });
  
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: (updatedOrder) => {
        this.toastr.remove(toastRef.toastId); // Remove processing toast
        
        if (updatedOrder) {
          console.log('Order status updated successfully:', updatedOrder);
          
          // Update the order in the orders list
          const index = this.orders.findIndex(o => o.orderId === orderId);
          if (index !== -1) {
            this.orders[index] = {
              ...this.orders[index],
              ...updatedOrder
            };
          }
          
          // If we're viewing this order, update the selected order
          if (this.selectedOrder && this.selectedOrder.orderId === orderId) {
            this.selectedOrder = {
              ...this.selectedOrder,
              ...updatedOrder
            };
          }
          
          // Re-filter the orders
          this.filterOrders();
          
          // Success toast with checkmark icon
          this.toastr.success(
            `<div class="flex items-center">
              <i class="fas fa-check-circle mr-2"></i>
              Order #${orderId} status updated to ${status}
            </div>`, 
            'Success!',
            {
              enableHtml: true,
              timeOut: 3000,
              progressBar: true
            }
          );
        } else {
          this.toastr.error('Failed to update order status', 'Error');
        }
      },
      error: (error) => {
        this.toastr.remove(toastRef.toastId); // Remove processing toast
        console.error('Error updating order status', error);
        this.toastr.error(
          `<div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            Could not update order status
          </div>`,
          'Error',
          {
            enableHtml: true,
            timeOut: 3000
          }
        );
      }
    });
  }

  cancelOrder(orderId: number): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      console.log(`Cancelling order ${orderId}`);
      
      this.orderService.cancelOrder(orderId).subscribe({
        next: (response) => {
          if (response && response.success !== false) {
            console.log(`Order ${orderId} cancelled successfully`);
            
            // Update order status locally
            const index = this.orders.findIndex(o => o.orderId === orderId);
            if (index !== -1) {
              this.orders[index].orderStatus = OrderStatus.CANCELLED;
              
              // If an order is selected and it's the one being cancelled, update it
              if (this.selectedOrder && this.selectedOrder.orderId === orderId) {
                this.selectedOrder.orderStatus = OrderStatus.CANCELLED;
              }
              
              this.filterOrders();
            }
            
            this.toastr.success(`Order #${orderId} has been cancelled`, 'Order Cancelled');
          } else {
            this.toastr.error('Could not cancel order', 'Operation Failed');
          }
        },
        error: (error) => {
          console.error('Error cancelling order', error);
          this.toastr.error('Could not cancel order', 'Error');
        }
      });
    }
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    
    this.currentPage = page;
    
    // Load orders based on current status filter
    if (this.currentStatus === 'ALL') {
      this.loadOrders();
    } else {
      this.filterByStatus(this.currentStatus);
    }
  }
  
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalOrders / this.itemsPerPage);
    this.pageNumbers = this.generatePageNumbers(this.totalPages, this.currentPage);
  }
  
  generatePageNumbers(totalPages: number, currentPage: number): number[] {
    const maxPagesToShow = 5;
    let pages: number[] = [];
    
    if (totalPages <= maxPagesToShow) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }
    
    return pages;
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      case OrderStatus.CONFIRMED:
        return 'bg-indigo-100 text-indigo-800';
      case OrderStatus.SHIPPED:
        return 'bg-purple-100 text-purple-800';
      case OrderStatus.DELIVERED:
        return 'bg-green-100 text-green-800';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case OrderStatus.RETURNED:
        return 'bg-gray-100 text-gray-800';
      case OrderStatus.REFUNDED:
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

