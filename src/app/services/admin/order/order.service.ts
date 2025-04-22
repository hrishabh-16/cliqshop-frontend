import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, forkJoin, switchMap } from 'rxjs';
import { Order, OrderStatus, PaymentStatus } from '../../../models/order.model';
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
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`).pipe(
      map(order => {
        if (!order) {
          throw new Error('Order not found');
        }
        return this.processOrderData(order);
      }),
      catchError(error => {
        console.error(`Error fetching order ${id}:`, error);
        // Return a minimal order object if fetch fails
        const fallbackOrder: Order = {
          orderId: id,
          userId: 0,
          orderDate: new Date().toISOString(),
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: 'Unknown',
          shippingMethod: 'Standard',
          orderItems: [],
          orderTotal: 0,
          totalPrice: 0,
          subtotal: 0,
          tax: 0,
          shippingCost: 0,
          discount: 0
        };
        return of(this.processOrderData(fallbackOrder));
      })
    );
  }

  // Update order status (admin)
  // Update the updateOrderStatus method in AdminOrderService
updateOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
  console.log(`Updating order ${orderId} status to ${status}`);
  
  return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/status`, { status }).pipe(
    map(response => {
      // Handle different response formats
      let updatedOrder: Order;
      
      if (response && response.orderId) {
        // If response is an Order object
        updatedOrder = response;
      } else if (response && response.orderStatus) {
        // If response has just the status update
        updatedOrder = {
          orderId: orderId,
          orderStatus: response.orderStatus
        } as Order;
      } else {
        // Fallback if response format is unexpected
        updatedOrder = {
          orderId: orderId,
          orderStatus: status
        } as Order;
      }
      
      return this.processOrderData(updatedOrder);
    }),
    catchError(error => {
      console.error(`Error updating order status for order ${orderId}:`, error);
      // Return a minimal order object with the new status
      return of({
        orderId: orderId,
        orderStatus: status
      } as Order);
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
public  processOrderData(order: Order): Order {
  if (!order) return null as any;
  
  // Ensure basic order properties exist
  order.orderId = order.orderId || 0;
  order.userId = order.userId || 0;
  order.orderDate = order.orderDate || new Date().toISOString();
  order.orderStatus = order.orderStatus || OrderStatus.PENDING;
  order.paymentStatus = order.paymentStatus || PaymentStatus.PENDING;
  order.paymentMethod = order.paymentMethod || 'Unknown';
  order.shippingMethod = order.shippingMethod || 'Standard';
  
  // Calculate totals if not provided
  if (!order.orderTotal && !order.totalPrice) {
    order.orderTotal = 0;
    if (order.orderItems) {
      order.orderTotal = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  } else if (!order.orderTotal) {
    order.orderTotal = order.totalPrice;
  }
  
  // Ensure order items exists and is an array
  if (!order.orderItems) {
    order.orderItems = [];
  } else {
    // Ensure each order item has required fields
    order.orderItems = order.orderItems.map(item => {
      return {
        orderItemId: item.orderItemId || 0,
        productId: item.productId || 0,
        quantity: item.quantity || 0,
        price: item.price || 0,
        product: item.product !== undefined ? item.product : undefined
      };
    });
  }
  
  // Ensure customer information exists
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
  
  // Ensure addresses exist
  if (!order.shippingAddress) {
    order.shippingAddress = {
      addressId: 0,
      userId: order.userId,
      addressLine1: 'Address unavailable',
      addressLine2: '', // Added missing property
      city: '-',
      state: '-',
      postalCode: '-',
      country: '-',
      isDefault: false,
      addressType: 'SHIPPING'
    };
  }
  
  if (!order.billingAddress) {
    order.billingAddress = {
      ...order.shippingAddress,
      addressType: 'BILLING'
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