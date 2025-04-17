import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalCategories: number;
  totalOrders: number;
  lowStockItems: number;
}

export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: number;
  categoryName?: string;
}

export interface Category {
  categoryId: number;
  name: string;
  description: string;
}

export interface Order {
  orderId: number;
  orderDate: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalPrice: number;
  userId: number;
  userName?: string;
}

export interface User {
  userId: number;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(private http: HttpClient) {}

  // Get dashboard statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard/stats`);
  }

  // Get recent products
  getRecentProducts(count: number = 5): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/admin/dashboard/recent-products?count=${count}`);
  }

  // Get all products with pagination
  getProducts(page: number = 1, limit: number = 10): Observable<{products: Product[], total: number}> {
    return this.http.get<Product[]>(`${this.apiUrl}/admin/products?page=${page}&limit=${limit}`)
      .pipe(
        map(products => ({
          products,
          total: products.length // This will be replaced by actual total from backend if available
        }))
      );
  }

  // Get recent categories
  getRecentCategories(count: number = 5): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/admin/dashboard/recent-categories?count=${count}`);
  }

  // Get all categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/admin/categories`);
  }

  // Get recent orders
  getRecentOrders(count: number = 5): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/admin/orders?limit=${count}`);
  }

  // Get all orders with pagination
  getOrders(page: number = 1, limit: number = 10): Observable<{orders: Order[], total: number}> {
    return this.http.get<Order[]>(`${this.apiUrl}/admin/orders?page=${page}&limit=${limit}`)
      .pipe(
        map(orders => ({
          orders,
          total: orders.length // This will be replaced by actual total from backend if available
        }))
      );
  }

  // Get users with pagination
  getUsers(page: number = 1, limit: number = 10): Observable<{users: User[], total: number}> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users?page=${page}&limit=${limit}`)
      .pipe(
        map(users => ({
          users,
          total: users.length // This will be replaced by actual total from backend if available
        }))
      );
  }

  // Get low stock items
  getLowStockItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/dashboard/low-stock-items`);
  }

  // Search functionality
  search(query: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/search?q=${query}`);
  }
}