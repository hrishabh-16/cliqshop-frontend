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
  getOrderById(id: number): Observable<Order> {
    console.log(`Getting order with ID ${id} from:`, `${this.baseUrl}/orders/${id}`);
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`).pipe(
      map(order => {
        // Process order to ensure required properties exist
        return this.processOrderData(order);
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

  // Process order data to ensure all required properties exist
  private processOrderData(order: Order): Order {
    if (!order) return null as any;
    
    // Ensure order items exists and is an array
    if (!order.orderItems) {
      order.orderItems = [];
    }
    
    // Ensure the order has customer information (basic placeholder)
    if (!order.customer) {
      const defaultUser: User = {
        userId: order.userId,
        username: `user${order.userId}`,
        name: `User #${order.userId}`,
        email: '-',
        role: UserRole.USER,
        enabled: true,
        createdAt: new Date().toISOString()
      };
      order.customer = defaultUser;
    }
    
    // Ensure the order has shipping address information
    if (!order.shippingAddress) {
      const defaultAddress: Address = {
        addressId: 0,
        userId: order.userId,
        addressLine1: 'Address unavailable',
        addressLine2: null,
        city: '-',
        state: '-',
        postalCode: '-',
        country: '-',
        isDefault: false,
        addressType: 'SHIPPING',
        name: `User #${order.userId}`,
        phone: '-'
      };
      order.shippingAddress = defaultAddress;
    }
    
    // Ensure the order has billing address information if different from shipping
    if (!order.billingAddress && order.billingAddressId) {
      const defaultAddress: Address = {
        addressId: order.billingAddressId,
        userId: order.userId,
        addressLine1: 'Billing address unavailable',
        addressLine2: null,
        city: '-',
        state: '-',
        postalCode: '-',
        country: '-',
        isDefault: false,
        addressType: 'BILLING',
        name: `User #${order.userId}`,
        phone: '-'
      };
      order.billingAddress = defaultAddress;
    }
    
    // Ensure the order has payment information
    if (!order.paymentInfo) {
      order.paymentInfo = {
        paymentMethod: order.paymentMethod || 'card',
        paymentStatus: order.paymentStatus || 'PENDING'
      };
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