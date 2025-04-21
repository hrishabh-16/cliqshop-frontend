import { Component, OnInit } from '@angular/core';
import { AdminOrderService } from '../../../services/admin/order/order.service';
import { Order, OrderStatus } from '../../../models/order.model';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../../services/user/user.service';
import { finalize, forkJoin } from 'rxjs';

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
    console.log(`Loading orders. Current status: ${this.currentStatus}, Page: ${this.currentPage}`);
    
    // Use the updated service method following dashboard pattern
    this.orderService.getAllOrders(this.currentPage, this.itemsPerPage).subscribe({
      next: (data) => {
        console.log('Orders loaded successfully:', data);
        
        // Ensure we have order items array for each order
        this.orders = data.map(order => {
          // Make sure orderItems is an array
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
    console.log('Status filter changed to:', status);
    this.currentStatus = status;
    
    // When changing status filter, go back to first page
    this.currentPage = 1;
    
    // If filtering by status other than ALL, use the specific endpoint
    if (status !== 'ALL') {
      this.loading = true;
      this.orderService.getOrdersByStatus(status as OrderStatus, this.currentPage, this.itemsPerPage).subscribe({
        next: (data) => {
          console.log(`Loaded ${data.length} orders with status ${status}`);
          
          // Ensure we have order items array for each order
          this.orders = data.map(order => {
            // Make sure orderItems is an array
            if (!order.orderItems) {
              order.orderItems = [];
            }
            return order;
          });
          
          this.filteredOrders = [...this.orders];
          this.loading = false;
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
      // For ALL status, reload all orders
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
    
    // Fetch complete order details
    forkJoin([
      this.orderService.getOrderById(order.orderId),
      this.userService.getUserById(order.userId)
    ]).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: ([orderDetails, userData]) => {
        if (orderDetails) {
          console.log('Full order details fetched:', orderDetails);
          this.selectedOrder = orderDetails;
          
          // Ensure orderItems exists
          if (!this.selectedOrder.orderItems) {
            this.selectedOrder.orderItems = [];
          }
          
          // Set customer information from user data
          if (userData) {
            this.selectedOrder.customer = {
              ...userData,
              name: userData.name || userData.username || `User #${userData.userId}`
            };
          }
        } else {
          // If no details returned, use the order from the list
          console.log('Using order from list as detailed fetch failed');
          this.selectedOrder = order;
        }
      },
      error: (error) => {
        console.error('Error fetching order details:', error);
        // If error, use the order from the list as fallback
        this.selectedOrder = order;
        this.toastr.warning('Using limited order details', 'Unable to fetch complete order information');
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
    
    // Convert string status to enum
    const status = statusValue as OrderStatus;
    
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: (updatedOrder) => {
        if (updatedOrder) {
          console.log('Order status updated successfully:', updatedOrder);
          
          // Update local data
          const index = this.orders.findIndex(o => o.orderId === orderId);
          if (index !== -1) {
            // Keep customer info from original order if not in updated order
            if (!updatedOrder.customer && this.orders[index].customer) {
              updatedOrder.customer = this.orders[index].customer;
            }
            
            this.orders[index] = updatedOrder;
            
            // If an order is selected and it's the one being updated, update it
            if (this.selectedOrder && this.selectedOrder.orderId === orderId) {
              // Keep customer info in selected order
              if (!updatedOrder.customer && this.selectedOrder.customer) {
                updatedOrder.customer = this.selectedOrder.customer;
              }
              
              this.selectedOrder = updatedOrder;
              
              // Ensure orderItems exists
              if (!this.selectedOrder.orderItems) {
                this.selectedOrder.orderItems = [];
              }
            }
            
            this.filterOrders();
          }
          
          this.toastr.success(`Order #${orderId} updated to ${status}`, 'Status Updated');
        } else {
          this.toastr.error('Failed to update order status', 'Error');
        }
      },
      error: (error) => {
        console.error('Error updating order status', error);
        this.toastr.error('Could not update order status', 'Error');
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
    this.loadOrders();
  }
  
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalOrders / this.itemsPerPage);
    this.pageNumbers = this.generatePageNumbers(this.totalPages, this.currentPage);
  }
  
  generatePageNumbers(totalPages: number, currentPage: number): number[] {
    const maxPagesToShow = 5;
    let pages: number[] = [];
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Calculate which pages to show
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      // Adjust if near end
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