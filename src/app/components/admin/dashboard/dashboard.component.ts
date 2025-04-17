import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats, Product, Order, Category, User } from '../../../services/dashboard/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone : false,
  templateUrl: './dashboard.component.html',

})
export class DashboardComponent implements OnInit {
  // Sidebar state
  sidebarOpen = true;
  isDarkMode = false;
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  showProfileDropdown = false;
  currentDate: Date = new Date();

  // Expandable menus
  menus = {
    products: false,
    categories: false,
    inventory: false,
    orders: false,
    users: false,
    settings: false
  };
  
  // Notification counter
  notificationsCount = 3;
  
  // User profile data
  userProfile = {
    name: 'Admin User',
    imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg'
  };

  // Dashboard statistics
  dashboardStats: DashboardStats = {
    totalProducts: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalOrders: 0,
    lowStockItems: 0
  };

  // Quick stats for cards
  quickStats = [
    { title: 'Total Products', value: 0, icon: 'fa-box-open', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
    { title: 'Total Users', value: 0, icon: 'fa-users', bgColor: 'bg-green-100', textColor: 'text-green-600' },
    { title: 'Total Categories', value: 0, icon: 'fa-tags', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
    { title: 'Total Orders', value: 0, icon: 'fa-shopping-cart', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
    { title: 'Low Stock', value: 0, icon: 'fa-exclamation-triangle', bgColor: 'bg-red-100', textColor: 'text-red-600' }
  ];

  // Recent data lists
  recentProducts: Product[] = [];
  recentOrders: Order[] = [];
  recentCategories: Category[] = [];
  recentUsers: User[] = [];

  // Pagination
  totalProducts = 0;
  totalOrders = 0;
  totalUsers = 0;
  
  currentProductPage = 1;
  currentOrderPage = 1;
  currentUserPage = 1;
  
  itemsPerPage = 5;
  
  // Generate page numbers
  productPages: number[] = [1, 2, 3];
  orderPages: number[] = [1, 2, 3];
  userPages: number[] = [1, 2, 3];

  // Loading states
  isLoading = {
    stats: false,
    products: false,
    orders: false,
    categories: false,
    users: false
  };

  constructor(
    private dashboardService: DashboardService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check for saved theme preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
      
      // Set dark theme colors
      document.documentElement.style.setProperty('--primary-bg', '#1e293b'); // slate-800
      document.documentElement.style.setProperty('--secondary-bg', '#334155'); // slate-700
      document.documentElement.style.setProperty('--text-primary', '#f8fafc'); // slate-50
      document.documentElement.style.setProperty('--text-secondary', '#94a3b8'); // slate-400
      document.documentElement.style.setProperty('--accent-color', '#38bdf8'); // sky-400
    } else {
      // Set light theme colors (default)
      document.documentElement.style.setProperty('--primary-bg', '#f1f5f9'); // slate-100
      document.documentElement.style.setProperty('--secondary-bg', '#ffffff'); // white
      document.documentElement.style.setProperty('--text-primary', '#334155'); // slate-700
      document.documentElement.style.setProperty('--text-secondary', '#64748b'); // slate-500
      document.documentElement.style.setProperty('--accent-color', '#0284c7'); // sky-600
    }
    
    // Check for saved sidebar state
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState === 'false') {
      this.sidebarOpen = false;
    }
    
    // Load all dashboard data
    this.loadDashboardData();
    this.loadRecentProducts();
    this.loadRecentOrders();
    this.loadRecentCategories();
    this.loadRecentUsers();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    localStorage.setItem('sidebarOpen', this.sidebarOpen.toString());
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    
    // Toggle the dark class on the HTML element
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    
    // Update theme colors
    if (this.isDarkMode) {
      // Dark theme colors
      document.documentElement.style.setProperty('--primary-bg', '#1e293b'); // slate-800
      document.documentElement.style.setProperty('--secondary-bg', '#334155'); // slate-700
      document.documentElement.style.setProperty('--text-primary', '#f8fafc'); // slate-50
      document.documentElement.style.setProperty('--text-secondary', '#94a3b8'); // slate-400
      document.documentElement.style.setProperty('--accent-color', '#38bdf8'); // sky-400
    } else {
      // Light theme colors
      document.documentElement.style.setProperty('--primary-bg', '#f1f5f9'); // slate-100
      document.documentElement.style.setProperty('--secondary-bg', '#ffffff'); // white
      document.documentElement.style.setProperty('--text-primary', '#334155'); // slate-700
      document.documentElement.style.setProperty('--text-secondary', '#64748b'); // slate-500
      document.documentElement.style.setProperty('--accent-color', '#0284c7'); // sky-600
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', this.isDarkMode ? 'true' : 'false');
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  toggleMenu(menu: 'products' | 'categories' | 'inventory' | 'orders' | 'users' | 'settings'): void {
    this.menus[menu] = !this.menus[menu];
  }

  logout(): void {
    // Clear user data and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  search(): void {
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.dashboardService.search(this.searchQuery).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error searching:', error);
        this.isSearching = false;
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading.stats = true;
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.quickStats[0].value = stats.totalProducts;
        this.quickStats[1].value = stats.totalUsers;
        this.quickStats[2].value = stats.totalCategories;
        this.quickStats[3].value = stats.totalOrders;
        this.quickStats[4].value = stats.lowStockItems;
        this.totalProducts = stats.totalProducts;
        this.totalOrders = stats.totalOrders;
        this.isLoading.stats = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading.stats = false;
      }
    });
  }

  loadRecentProducts(): void {
    this.isLoading.products = true;
    this.dashboardService.getRecentProducts(this.itemsPerPage).subscribe({
      next: (products) => {
        this.recentProducts = products;
        this.isLoading.products = false;
      },
      error: (error) => {
        console.error('Error loading recent products:', error);
        this.isLoading.products = false;
      }
    });
  }

  loadRecentOrders(): void {
    this.isLoading.orders = true;
    this.dashboardService.getRecentOrders(this.itemsPerPage).subscribe({
      next: (orders) => {
        this.recentOrders = orders;
        this.isLoading.orders = false;
      },
      error: (error) => {
        console.error('Error loading recent orders:', error);
        this.isLoading.orders = false;
      }
    });
  }

  loadRecentCategories(): void {
    this.isLoading.categories = true;
    this.dashboardService.getRecentCategories(this.itemsPerPage).subscribe({
      next: (categories) => {
        this.recentCategories = categories;
        this.isLoading.categories = false;
      },
      error: (error) => {
        console.error('Error loading recent categories:', error);
        this.isLoading.categories = false;
      }
    });
  }

  loadRecentUsers(): void {
    this.isLoading.users = true;
    this.dashboardService.getUsers(1, this.itemsPerPage).subscribe({
      next: (data) => {
        this.recentUsers = data.users;
        this.totalUsers = data.total;
        this.isLoading.users = false;
      },
      error: (error) => {
        console.error('Error loading recent users:', error);
        this.isLoading.users = false;
      }
    });
  }

  goToPage(type: 'products' | 'orders' | 'users', page: number): void {
    if (type === 'products') {
      this.currentProductPage = page;
      this.loadRecentProducts();
    } else if (type === 'orders') {
      this.currentOrderPage = page;
      this.loadRecentOrders();
    } else if (type === 'users') {
      this.currentUserPage = page;
      this.loadRecentUsers();
    }
  }

  // Helper method for status color
  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'text-yellow-600';
      case 'PROCESSING': return 'text-blue-600';
      case 'SHIPPED': return 'text-purple-600';
      case 'DELIVERED': return 'text-green-600';
      case 'CANCELLED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }
}