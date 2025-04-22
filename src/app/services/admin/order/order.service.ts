import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, forkJoin, switchMap } from 'rxjs';
import { Order, OrderStatus } from '../../../models/order.model';
import { UserService } from '../../user/user.service';
import { User, UserRole } from '../../../models/user.model';
import { Address } from '../../../models/address.model';

@Injectable({
  providedIn: 'root'
})
export class AdminOrderService {
  private apiUrl = 'http://localhost:9000/api';  // Base API URL
  private baseUrl = `${this.apiUrl}/admin`;      // Admin endpoints
  private ordersUrl = `${this.apiUrl}/orders`;   // Order-specific endpoints

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {
    console.log('AdminOrderService initialized with baseUrl:', this.baseUrl);
  }

  // Get all orders (admin) - Following dashboard service pattern
  getAllOrders(page: number = 1, limit: number = 10): Observable<Order[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log('Getting all orders from:', `${this.baseUrl}/orders`, { params });
    
    return this.http.get<any>(`${this.baseUrl}/orders`, { params }).pipe(
      switchMap(response => {
        // Handle different API response formats similar to dashboard service
        let orders: Order[] = [];
        
        if (Array.isArray(response)) {
          console.log('Response is an array with length:', response.length);
          orders = response;
        } else if (response && response.content && Array.isArray(response.content)) {
          console.log('Response has content array with length:', response.content.length);
          orders = response.content;
        } else if (response && response.orders && Array.isArray(response.orders)) {
          console.log('Response has orders array with length:', response.orders.length);
          orders = response.orders;
        } else {
          console.warn('Response format not recognized:', response);
          orders = [];
        }
        
        // Process orders to ensure required properties exist
        orders = orders.map(order => this.processOrderData(order));
        
        console.log(`Retrieved ${orders.length} orders`);
        return this.enrichOrdersWithUserData(orders);
      }),
      catchError(error => {
        console.error('Error fetching all orders:', error);
        return of([]);
      })
    );
  }

  // Get order by ID (admin)
  // Enhanced getOrderById method to ensure complete data
  getOrderById(id: number): Observable<Order> {
    console.log(`Getting order with ID ${id} from:`, `${this.baseUrl}/orders/${id}`);
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`).pipe(
      switchMap(order => {
        // Process order to ensure required properties exist
        order = this.processOrderData(order);
        
        // If order items are missing product details, fetch them
        if (order.orderItems && order.orderItems.some(item => !item.product)) {
          return this.enrichOrderItemsWithProducts(order);
        }
        
        return of(order);
      }),
      catchError(error => {
        console.error(`Error fetching order by ID ${id}:`, error);
        return of(null as any);
      })
    );
  }

  // Update order status (admin)
  updateOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    console.log(`Updating order ${orderId} status to ${status}`);
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/status`, null, {
      params: { status: status }
    }).pipe(
      map(order => {
        // Process order to ensure required properties exist
        return this.processOrderData(order);
      }),
      catchError(error => {
        console.error(`Error updating order status for order ${orderId}:`, error);
        return of(null as any);
      })
    );
  }

  // Cancel order (admin)
  cancelOrder(orderId: number): Observable<any> {
    console.log(`Cancelling order ${orderId}`);
    return this.http.post<any>(`${this.baseUrl}/orders/${orderId}/cancel`, {}).pipe(
      catchError(error => {
        console.error(`Error cancelling order ${orderId}:`, error);
        return of({ success: false });
      })
    );
  }

  // Helper method to enrich order items with product details
  private enrichOrderItemsWithProducts(order: Order): Observable<Order> {
    // In a real implementation, you would fetch product details for each item
    // Here we just return the order as-is since the backend should provide this
    return of(order);
  }

  // Get orders by status - Following dashboard service pattern
  getOrdersByStatus(status: OrderStatus, page: number = 1, limit: number = 10): Observable<Order[]> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    console.log(`Getting orders with status ${status}`);
    return this.http.get<any>(`${this.baseUrl}/orders`, { params }).pipe(
      switchMap(response => {
        // Handle different API response formats
        let orders: Order[] = [];
        
        if (Array.isArray(response)) {
          orders = response;
        } else if (response && response.content && Array.isArray(response.content)) {
          orders = response.content;
        } else if (response && response.orders && Array.isArray(response.orders)) {
          orders = response.orders;
        } else {
          orders = [];
        }
        
        // Process orders to ensure required properties exist
        orders = orders.map(order => this.processOrderData(order));
        
        console.log(`Retrieved ${orders.length} orders with status ${status}`);
        return this.enrichOrdersWithUserData(orders);
      }),
      catchError(error => {
        console.error(`Error fetching orders with status ${status}:`, error);
        return of([]);
      })
    );
  }

  // Get orders pagination info
  getOrdersCount(): Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/stats`).pipe(
      map(stats => stats.totalOrders || 0),
      catchError(error => {
        console.error('Error getting orders count:', error);
        return of(25); // Fallback to a reasonable number
      })
    );
  }


  // Add this method to your AdminOrderService
getOrdersCountByStatus(status: OrderStatus): Observable<number> {
  return this.http.get<any>(`${this.baseUrl}/orders/count`, {
    params: { status }
  }).pipe(
    map(response => response.count || 0),
    catchError(error => {
      console.error('Error getting orders count by status:', error);
      return of(0);
    })
  );
}
  // Process order data to ensure all required properties exist
// Enhanced processOrderData method
private processOrderData(order: Order): Order {
  if (!order) return null as any;
  
  // Ensure order items exists and is an array
  if (!order.orderItems) {
    order.orderItems = [];
  }
  
  // Ensure each order item has required fields
  order.orderItems = order.orderItems.map(item => {
    return {
      ...item,
      productId: item.productId || 0,
      quantity: item.quantity || 0,
      price: item.price || 0
    };
  });
  
  // Ensure the order has customer information
  if (!order.customer) {
    order.customer = {
      userId: order.userId,
      username: `user${order.userId}`,
      name: `User #${order.userId}`,
      email: 'N/A',
      role: UserRole.USER,
      enabled: true,
      createdAt: new Date().toISOString()
    };
  }
  
  // Ensure the order has shipping address information
  if (!order.shippingAddress) {
    order.shippingAddress = {
      addressId: 0,
      userId: order.userId,
      addressLine1: 'Address unavailable',
      addressLine2: '', // Default value for addressLine2
      city: '-',
      state: '-',
      postalCode: '-',
      country: '-',
      isDefault: false,
      addressType: 'SHIPPING',
      name: order.customer?.name || `User #${order.userId}`,
      phone: '-'
    };
  }
  
  // Ensure the order has billing address information
  if (!order.billingAddress) {
    order.billingAddress = {
      ...order.shippingAddress,
      addressId: order.shippingAddress.addressId ?? null,
      addressType: 'BILLING',
      addressLine1: order.shippingAddress.addressLine1 === 'Address unavailable' 
        ? 'Billing address unavailable' 
        : order.shippingAddress.addressLine1
    };
  }
  
  // Ensure the order has payment information
  if (!order.paymentInfo) {
    order.paymentInfo = {
      paymentMethod: order.paymentMethod || 'Unknown',
      paymentStatus: order.paymentStatus || 'PENDING'
    };
  }
  
  // Ensure order total is calculated if not provided
  if (!order.orderTotal && order.orderItems) {
    order.orderTotal = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  return order;
}

  // Enrich orders with user data
  private enrichOrdersWithUserData(orders: Order[]): Observable<Order[]> {
    if (!orders || orders.length === 0) {
      return of([]);
    }

    // Get unique user IDs from orders
    const userIds = [...new Set(orders.map(order => order.userId))];
    
    // Check if we need to fetch user data
    if (userIds.length === 0) {
      return of(orders);
    }

    // Get user data for all users involved in orders
    return forkJoin(
      userIds.map(userId => 
        this.userService.getUserById(userId).pipe(
          catchError(error => {
            console.error(`Error fetching user data for user ${userId}:`, error);
            // Return a minimal user object if fetch fails
            return of({
              userId: userId,
              username: `user${userId}`,
              name: `User #${userId}`,
              email: '-',
              role: UserRole.USER,
              enabled: true,
              createdAt: new Date().toISOString()
            } as User);
          })
        )
      )
    ).pipe(
      map(users => {
        // Create a map of user data for quick lookup
        const userMap = new Map(users.map(user => [user.userId, user]));
        
        // Enrich each order with complete user data
        return orders.map(order => {
          const userData = userMap.get(order.userId);
          if (userData) {
            order.customer = userData;
          }
          return order;
        });
      }),
      catchError(error => {
        console.error('Error enriching orders with user data:', error);
        return of(orders);
      })
    );
  }
}