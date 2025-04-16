import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Product {
  id: number;
  imageUrl: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName?: string;
}

interface Order {
  id: number;
  order_id: string;
  order_date: string;
  status: string;
  total_price: number;
  shipping_address_id: number;
  user_id: number;
  user_name?: string;
}

interface Statistics {
  totalProducts: number;
  totalUsers: number;
  totalCategories: number;
  totalOrders: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

interface LowStockProduct {
  name: string;
  stock: number;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // API base URL
  private apiUrl = '/api';

  // Sidebar state
  isSidebarOpen = true;
  isProductsOpen = false;
  isCategoryOpen = false;
  isInventoryOpen = false;
  isSettingsOpen = false;

  // Dashboard data
  statistics: Statistics = {
    totalProducts: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalOrders: 0
  };

  recentProducts: Product[] = [];
  recentOrders: Order[] = [];
  
  // Inventory reports
  totalOrders = 0;
  totalRevenue = 0;
  averageOrderValue = 0;
  orderStatuses: OrderStatus[] = [];
  
  // Profile details
  totalProductCount = 0;
  totalInventoryValue = 0;
  lowStockItems = 0;
  lowStockProducts: LowStockProduct[] = [];

  // Pagination
  currentProductPage = 1;
  currentOrderPage = 1;
  itemsPerPage = 5;
  totalProductPages = 1;
  totalOrderPages = 1;

  // Loading states
  loading = {
    statistics: true,
    products: true,
    orders: true,
    inventoryReport: true,
    profileDetails: true
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchStatistics();
    this.fetchRecentProducts();
    this.fetchRecentOrders();
    this.fetchInventoryReport();
    this.fetchProfileDetails();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleSubmenu(menu: string): void {
    switch (menu) {
      case 'products':
        this.isProductsOpen = !this.isProductsOpen;
        break;
      case 'category':
        this.isCategoryOpen = !this.isCategoryOpen;
        break;
      case 'inventory':
        this.isInventoryOpen = !this.isInventoryOpen;
        break;
      case 'settings':
        this.isSettingsOpen = !this.isSettingsOpen;
        break;
    }
  }

  fetchStatistics(): void {
    this.loading.statistics = true;
    this.http.get<Statistics>(`${this.apiUrl}/admin/dashboard/statistics`)
      .subscribe({
        next: (data) => {
          this.statistics = data;
          this.loading.statistics = false;
        },
        error: (error) => {
          console.error('Error fetching statistics:', error);
          this.loading.statistics = false;
          // For demo purposes, set mock data
          this.statistics = {
            totalProducts: 150,
            totalUsers: 324,
            totalCategories: 15,
            totalOrders: 568
          };
        }
      });
  }

  fetchRecentProducts(): void {
    this.loading.products = true;
    this.http.get<Product[]>(`${this.apiUrl}/admin/products/recent`)
      .subscribe({
        next: (data) => {
          this.recentProducts = data;
          this.totalProductPages = Math.ceil(data.length / this.itemsPerPage);
          this.loading.products = false;
        },
        error: (error) => {
          console.error('Error fetching recent products:', error);
          this.loading.products = false;
          // Mock data for demo
          this.recentProducts = [
            { id: 1, imageUrl: '/assets/images/products/product1.jpg', productId: 'PRD-001', name: 'Smartphone X10', description: 'Latest smartphone with advanced features', price: 999.99, categoryId: 1, categoryName: 'Electronics' },
            { id: 2, imageUrl: '/assets/images/products/product2.jpg', productId: 'PRD-002', name: 'Wireless Earbuds', description: 'High-quality wireless earbuds with noise cancellation', price: 149.99, categoryId: 1, categoryName: 'Electronics' },
            { id: 3, imageUrl: '/assets/images/products/product3.jpg', productId: 'PRD-003', name: 'Running Shoes', description: 'Comfortable running shoes for all terrains', price: 89.99, categoryId: 2, categoryName: 'Footwear' },
            { id: 4, imageUrl: '/assets/images/products/product4.jpg', productId: 'PRD-004', name: 'Cotton T-Shirt', description: '100% organic cotton t-shirt', price: 24.99, categoryId: 3, categoryName: 'Clothing' },
            { id: 5, imageUrl: '/assets/images/products/product5.jpg', productId: 'PRD-005', name: 'Smart Watch', description: 'Fitness tracking smartwatch with heart rate monitor', price: 199.99, categoryId: 1, categoryName: 'Electronics' },
            { id: 6, imageUrl: '/assets/images/products/product6.jpg', productId: 'PRD-006', name: 'Laptop Stand', description: 'Adjustable laptop stand for better ergonomics', price: 49.99, categoryId: 4, categoryName: 'Accessories' }
          ];
          this.totalProductPages = Math.ceil(this.recentProducts.length / this.itemsPerPage);
        }
      });
  }

  fetchRecentOrders(): void {
    this.loading.orders = true;
    this.http.get<Order[]>(`${this.apiUrl}/admin/orders/recent`)
      .subscribe({
        next: (data) => {
          this.recentOrders = data;
          this.totalOrderPages = Math.ceil(data.length / this.itemsPerPage);
          this.loading.orders = false;
        },
        error: (error) => {
          console.error('Error fetching recent orders:', error);
          this.loading.orders = false;
          // Mock data for demo
          this.recentOrders = [
            { id: 1, order_id: 'ORD-10001', order_date: '2023-04-15', status: 'Delivered', total_price: 1249.98, shipping_address_id: 101, user_id: 201, user_name: 'John Doe' },
            { id: 2, order_id: 'ORD-10002', order_date: '2023-04-14', status: 'Processing', total_price: 89.99, shipping_address_id: 102, user_id: 202, user_name: 'Jane Smith' },
            { id: 3, order_id: 'ORD-10003', order_date: '2023-04-14', status: 'Shipped', total_price: 199.99, shipping_address_id: 103, user_id: 203, user_name: 'Robert Johnson' },
            { id: 4, order_id: 'ORD-10004', order_date: '2023-04-13', status: 'Pending', total_price: 74.97, shipping_address_id: 104, user_id: 204, user_name: 'Sarah Williams' },
            { id: 5, order_id: 'ORD-10005', order_date: '2023-04-12', status: 'Delivered', total_price: 149.99, shipping_address_id: 105, user_id: 205, user_name: 'Michael Brown' },
            { id: 6, order_id: 'ORD-10006', order_date: '2023-04-12', status: 'Cancelled', total_price: 249.99, shipping_address_id: 106, user_id: 206, user_name: 'Emily Davis' }
          ];
          this.totalOrderPages = Math.ceil(this.recentOrders.length / this.itemsPerPage);
        }
      });
  }

  fetchInventoryReport(): void {
    this.loading.inventoryReport = true;
    this.http.get<any>(`${this.apiUrl}/admin/inventory/report`)
      .subscribe({
        next: (data) => {
          this.totalOrders = data.totalOrders;
          this.totalRevenue = data.totalRevenue;
          this.averageOrderValue = data.averageOrderValue;
          this.orderStatuses = data.orderStatuses;
          this.loading.inventoryReport = false;
        },
        error: (error) => {
          console.error('Error fetching inventory report:', error);
          this.loading.inventoryReport = false;
          // Mock data for demo
          this.totalOrders = 568;
          this.totalRevenue = 45689.75;
          this.averageOrderValue = 80.44;
          this.orderStatuses = [
            { status: 'Delivered', count: 345 },
            { status: 'Processing', count: 120 },
            { status: 'Shipped', count: 78 },
            { status: 'Pending', count: 15 },
            { status: 'Cancelled', count: 10 }
          ];
        }
      });
  }

  fetchProfileDetails(): void {
    this.loading.profileDetails = true;
    this.http.get<any>(`${this.apiUrl}/admin/profile/details`)
      .subscribe({
        next: (data) => {
          this.totalProductCount = data.totalProductCount;
          this.totalInventoryValue = data.totalInventoryValue;
          this.lowStockItems = data.lowStockItems;
          this.lowStockProducts = data.lowStockProducts;
          this.loading.profileDetails = false;
        },
        error: (error) => {
          console.error('Error fetching profile details:', error);
          this.loading.profileDetails = false;
          // Mock data for demo
          this.totalProductCount = 150;
          this.totalInventoryValue = 75250.50;
          this.lowStockItems = 8;
          this.lowStockProducts = [
            { name: 'Wireless Earbuds', stock: 5, value: 749.95 },
            { name: 'Smart Watch', stock: 3, value: 599.97 },
            { name: 'Running Shoes', stock: 7, value: 629.93 },
            { name: 'Laptop Stand', stock: 9, value: 449.91 }
          ];
        }
      });
  }

  goToProductPage(page: number): void {
    if (page >= 1 && page <= this.totalProductPages) {
      this.currentProductPage = page;
    }
  }

  goToOrderPage(page: number): void {
    if (page >= 1 && page <= this.totalOrderPages) {
      this.currentOrderPage = page;
    }
  }

  getPagedProducts(): Product[] {
    const startIndex = (this.currentProductPage - 1) * this.itemsPerPage;
    return this.recentProducts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getPagedOrders(): Order[] {
    const startIndex = (this.currentOrderPage - 1) * this.itemsPerPage;
    return this.recentOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getProductsPageNumbers(): number[] {
    return Array.from({ length: this.totalProductPages }, (_, i) => i + 1);
  }

  getOrdersPageNumbers(): number[] {
    return Array.from({ length: this.totalOrderPages }, (_, i) => i + 1);
  }
}