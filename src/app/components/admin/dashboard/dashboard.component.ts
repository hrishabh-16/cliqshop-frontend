import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
interface Product {
  imageUrl: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
}

interface Order {
  orderId: string;
  orderDate: Date;
  status: 'Pending' | 'Completed' | 'Cancelled';
  totalPrice: number;
}

interface UserProfile {
  imageUrl: string;
  name: string;
}
@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  sidebarOpen = true;
  menus = {
    products: false,
    categories: false,
    inventory: false,
    settings: false
  };
  
  notificationsCount = 3;
  userProfile = {
    name: 'Admin User',
    imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg'
  };

  quickStats = [
    { title: 'Total Products', value: 0, icon: 'fas fa-box-open', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
    { title: 'Total Users', value: 0, icon: 'fas fa-users', bgColor: 'bg-green-100', textColor: 'text-green-600' },
    { title: 'Total Categories', value: 0, icon: 'fas fa-tags', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
    { title: 'Total Orders', value: 0, icon: 'fas fa-shopping-cart', bgColor: 'bg-orange-100', textColor: 'text-orange-600' }
  ];
  recentProducts: Product[] = [];
  recentOrders: Order[] = [];
  recentUsers: UserProfile[] = [];
  recentCategories: string[] = [];
  recentInventory: string[] = [];
  recentNotifications: string[] = [];
  recentMessages: string[] = [];
  recentActivities: string[] = [];
  totalProducts = 0;
  totalOrders = 0;
  
  currentProductPage = 1;
  currentOrderPage = 1;
  itemsPerPage = 5;
  productPages = [1, 2, 3];
  orderPages = [1, 2, 3];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRecentProducts();
    this.loadRecentOrders();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMenu(menu: 'products' | 'categories' | 'inventory' | 'settings'): void {
    this.menus[menu] = !this.menus[menu];
    // Close other menus
    for (const key in this.menus) {
      if (key !== menu) {
        this.menus[key as 'products' | 'categories' | 'inventory' | 'settings'] = false;
      }
    }
  }

  loadDashboardData(): void {
    this.http.get('http://localhost:9000/api/admin/dashboard/stats').subscribe({
      next: (data: any) => {
        this.quickStats[0].value = data.totalProducts;
        this.quickStats[1].value = data.totalUsers;
        this.quickStats[2].value = data.totalCategories;
        this.quickStats[3].value = data.totalOrders;
        this.totalProducts = data.totalProducts;
        this.totalOrders = data.totalOrders;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
      }
    });
  }

  loadRecentProducts(): void {
    this.http.get(`http://localhost:9000/api/admin/dashboard/recent-products?page=${this.currentProductPage}&limit=${this.itemsPerPage}`).subscribe({
      next: (data: any) => {
        this.recentProducts = data.products || [];
      },
      error: (error) => {
        console.error('Error loading recent products:', error);
      }
    });
  }

  loadRecentOrders(): void {
    this.http.get(`http://localhost:9000/api/admin/dashboard/recent-orders?page=${this.currentOrderPage}&limit=${this.itemsPerPage}`).subscribe({
      next: (data: any) => {
        this.recentOrders = data.orders || [];
      },
      error: (error) => {
        console.error('Error loading recent orders:', error);
      }
    });
  }

  prevPage(type: 'products' | 'orders'): void {
    if (type === 'products' && this.currentProductPage > 1) {
      this.currentProductPage--;
      this.loadRecentProducts();
    } else if (type === 'orders' && this.currentOrderPage > 1) {
      this.currentOrderPage--;
      this.loadRecentOrders();
    }
  }

  nextPage(type: 'products' | 'orders'): void {
    if (type === 'products') {
      this.currentProductPage++;
      this.loadRecentProducts();
    } else if (type === 'orders') {
      this.currentOrderPage++;
      this.loadRecentOrders();
    }
  }

  goToPage(type: 'products' | 'orders', page: number): void {
    if (type === 'products') {
      this.currentProductPage = page;
      this.loadRecentProducts();
    } else if (type === 'orders') {
      this.currentOrderPage = page;
      this.loadRecentOrders();
    }
  }
}