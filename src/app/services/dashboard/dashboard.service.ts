import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CategoryService } from '../category/category.service';

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
  stockQuantity?: number;
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
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService
  ) {}

  // Get current logged in user
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/current`).pipe(
      catchError(error => {
        console.error('Error fetching current user:', error);
        // Return a default user if API fails
        return of({
          userId: 1,
          username: 'admin',
          name: 'Admin User',
          email: 'admin@cliqshop.com',
          phoneNumber: '',
          role: 'ADMIN' as 'ADMIN',
          createdAt: new Date().toISOString()
        });
      })
    );
  }

  // Get dashboard statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard/stats`).pipe(
      catchError(error => {
        console.error('Error fetching dashboard stats:', error);
        // Return default stats if API fails
        return of({
          totalProducts: 25,
          totalUsers: 18,
          totalCategories: 8,
          totalOrders: 42,
          lowStockItems: 5
        });
      })
    );
  }

  // Get recent products with pagination and category enrichment
  getRecentProducts(page: number = 1, limit: number = 5): Observable<{products: Product[], total: number}> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    return this.http.get<any>(`${this.apiUrl}/admin/products`, { params }).pipe(
      switchMap(response => {
        // Handle different API response formats
        let products: Product[] = [];
        let totalCount = 0;
        
        if (Array.isArray(response)) {
          products = response;
          totalCount = response.length > limit ? 20 : response.length; // Assume there's more if we hit the limit
        } else if (response && response.content && Array.isArray(response.content)) {
          products = response.content;
          totalCount = response.totalElements || response.total || 20;
        } else if (response && response.products && Array.isArray(response.products)) {
          products = response.products;
          totalCount = response.total || 20;
        } else {
          products = [];
          totalCount = 0;
        }
        
        // Load categories to enrich products
        return this.categoryService.getAllCategories().pipe(
          map(categories => {
            // Enhance products with category names
            const enhancedProducts = products.map(product => {
              const category = categories.find(c => 
                c.categoryId === product.categoryId || c.id === product.categoryId
              );
              
              return {
                ...product,
                categoryName: category ? category.name : 'Unknown'
              };
            });
            
            return {
              products: enhancedProducts,
              total: totalCount
            };
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching products:', error);
        // Return empty result if API fails
        return of({
          products: [],
          total: 0
        });
      })
    );
  }

  // Get all products with pagination
  getProducts(page: number = 1, limit: number = 10): Observable<{products: Product[], total: number}> {
    return this.getRecentProducts(page, limit);
  }

  // Get recent categories
  getRecentCategories(count: number = 5): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/admin/categories`).pipe(
      map(categories => categories.slice(0, count)),
      catchError(error => {
        console.error('Error fetching categories:', error);
        return of([]);
      })
    );
  }

  // Get all categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/admin/categories`).pipe(
      catchError(error => {
        console.error('Error fetching categories:', error);
        return of([]);
      })
    );
  }

  // Get recent orders with pagination
  getRecentOrders(count: number = 5): Observable<Order[]> {
    return this.getOrders(1, count).pipe(
      map(result => result.orders)
    );
  }

  // Get all orders with pagination
  getOrders(page: number = 1, limit: number = 10): Observable<{orders: Order[], total: number}> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    return this.http.get<any>(`${this.apiUrl}/admin/orders`, { params }).pipe(
      map(response => {
        // Handle different API response formats
        let orders: Order[] = [];
        let totalCount = 0;
        
        if (Array.isArray(response)) {
          orders = response;
          totalCount = response.length > limit ? 20 : response.length; // Assume there's more if we hit the limit
        } else if (response && response.content && Array.isArray(response.content)) {
          orders = response.content;
          totalCount = response.totalElements || response.total || 20;
        } else if (response && response.orders && Array.isArray(response.orders)) {
          orders = response.orders;
          totalCount = response.total || 20;
        } else {
          orders = [];
          totalCount = 0;
        }
        
        return {
          orders,
          total: totalCount
        };
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        // Return empty result if API fails
        return of({
          orders: [],
          total: 0
        });
      })
    );
  }

  // Get users with pagination
  getUsers(page: number = 1, limit: number = 10): Observable<{users: User[], total: number}> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    return this.http.get<any>(`${this.apiUrl}/admin/users`, { params }).pipe(
      map(response => {
        // Handle different API response formats
        let users: User[] = [];
        let totalCount = 0;
        
        if (Array.isArray(response)) {
          users = response;
          totalCount = response.length > limit ? 20 : response.length;
        } else if (response && response.content && Array.isArray(response.content)) {
          users = response.content;
          totalCount = response.totalElements || response.total || 20;
        } else if (response && response.users && Array.isArray(response.users)) {
          users = response.users;
          totalCount = response.total || 20;
        } else {
          users = [];
          totalCount = 0;
        }
        
        // Enhance users with profile image URLs if they don't have one
        users = users.map(user => ({
          ...user,
          imageUrl: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random`
        }));
        
        return {
          users,
          total: totalCount
        };
      }),
      catchError(error => {
        console.error('Error fetching users:', error);
        // Return empty result if API fails
        return of({
          users: [],
          total: 0
        });
      })
    );
  }

  // Get low stock items
  getLowStockItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/dashboard/low-stock-items`).pipe(
      catchError(error => {
        console.error('Error fetching low stock items:', error);
        return of([]);
      })
    );
  }

  // Search functionality
  search(query: string): Observable<any[]> {
    const params = new HttpParams().set('q', query);
    
    return this.http.get<any[]>(`${this.apiUrl}/admin/search`, { params }).pipe(
      catchError(error => {
        console.error('Error performing search:', error);
        return of([]);
      })
    );
  }
}