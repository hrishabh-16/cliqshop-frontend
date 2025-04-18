import { Component, OnInit, HostListener, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats, Product, Order, Category, User } from '../../../services/dashboard/dashboard.service';
import { UserService } from '../../../services/user/user.service';
import { ProductService } from '../../../services/product/product.service';
import { CategoryService } from '../../../services/category/category.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: false,
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
    settings: false,
    reports: false
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
  totalCategories = 0;
  
  currentProductPage = 1;
  currentOrderPage = 1;
  currentUserPage = 1;
  currentCategoryPage = 1;
  
  itemsPerPage = 5;
  
  // Generate page numbers
  productPages: number[] = [];
  orderPages: number[] = [];
  userPages: number[] = [];
  categoryPages: number[] = [];

  // Loading states
  isLoading = {
    stats: false,
    products: false,
    orders: false,
    categories: false,
    users: false
  };

  // Click outside handler for dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close profile dropdown if clicking outside
    const profileElement = document.querySelector('.profile-dropdown-container');
    if (this.showProfileDropdown && profileElement && !profileElement.contains(event.target as Node)) {
      this.showProfileDropdown = false;
    }
    
    // Close search results if clicking outside
    const searchElement = document.querySelector('.search-container');
    if (searchElement && !searchElement.contains(event.target as Node) && this.searchResults.length > 0) {
      this.searchResults = [];
    }
  }
  
  // Handle resize events to manage sidebar state in responsive mode
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if (window.innerWidth < 1024 && !this.sidebarOpen) {
      // When in mobile mode, make sure sidebar is fully hidden
      this.renderer.addClass(document.documentElement, 'sidebar-closed');
    } else {
      this.renderer.removeClass(document.documentElement, 'sidebar-closed');
    }
  }
 
  constructor(
    private dashboardService: DashboardService,
    private userService: UserService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
    private renderer: Renderer2
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
      if (window.innerWidth < 1024) {
        this.renderer.addClass(document.documentElement, 'sidebar-closed');
      }
    }
    
    // Load all dashboard data
    this.loadUserProfile();
    this.loadDashboardData();
    this.loadRecentProducts();
    this.loadRecentOrders();
    this.loadRecentCategories();
    this.loadRecentUsers();
  }

  // Method to handle search result selection
  selectSearchResult(result: any): void {
    this.searchResults = [];
    this.searchQuery = '';
    
    // Navigate based on result type
    if (result.type === 'Product') {
      this.router.navigate(['/admin/products'], { queryParams: { id: result.productId } });
    } else if (result.type === 'Order') {
      this.router.navigate(['/admin/orders'], { queryParams: { id: result.orderId } });
    } else if (result.type === 'Category') {
      this.router.navigate(['/admin/categories'], { queryParams: { id: result.categoryId } });
    } else if (result.type === 'User') {
      this.router.navigate(['/admin/users'], { queryParams: { id: result.userId } });
    }
  }

  loadUserProfile(): void {
    // First try to get from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userProfile = {
          name: user.name || user.username || 'Admin User',
          imageUrl: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random`
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.loadDefaultUserProfile();
      }
    } else {
      this.loadDefaultUserProfile();
    }
  }

  loadDefaultUserProfile(): void {
    // If no stored user data, try to fetch from API
    this.dashboardService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.userProfile = {
            name: user.name || user.username || 'Admin User',
            imageUrl: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random`
          };
        }
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        // Keep default values set in the class
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    localStorage.setItem('sidebarOpen', this.sidebarOpen.toString());
    
    // Add/remove sidebar-closed class for additional styling
    if (!this.sidebarOpen) {
      this.renderer.addClass(document.documentElement, 'sidebar-closed');
    } else {
      this.renderer.removeClass(document.documentElement, 'sidebar-closed');
    }
    
    // Force layout recalculation to ensure proper transition
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
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

  toggleMenu(menu: 'products' | 'categories' | 'inventory' | 'orders' | 'users' | 'settings' | 'reports'): void {
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
        this.searchResults = results.map((item: any) => {
          // Determine the type of each result
          let type = 'Unknown';
          if (item.productId !== undefined) type = 'Product';
          else if (item.orderId !== undefined) type = 'Order';
          else if (item.categoryId !== undefined) type = 'Category';
          else if (item.userId !== undefined) type = 'User';
          
          return {
            ...item,
            type
          };
        });
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error searching:', error);
        this.isSearching = false;
        this.searchResults = [];
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
        this.totalCategories = stats.totalCategories;
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
    
    // Get all products but disable inventory lookup
    this.productService.getAllProducts().pipe(
      catchError(error => {
        console.error('Error loading products:', error);
        return of({
          products: [],
          total: 0,
          page: 1,
          limit: 10
        });
      })
    ).subscribe({
      next: (response) => {
        // Store all products for pagination
        const allProducts = response.products;
        
        // Add category names
        const enhancedProducts = allProducts.map(product => {
          // Get category name from categoryService to avoid inventory requests
          const categoryName = product.categoryName || 
                              (product.categoryId ? this.categoryService.getCategoryNameById(product.categoryId) : 'Unknown');
          
          return {
            ...product,
            categoryName,
            // Add a default stockQuantity to avoid inventory requests
            stockQuantity: product.stockQuantity || 0
          };
        });
        
        // Calculate total and paginate
        this.totalProducts = enhancedProducts.length;
        
        // Get current page items (5 per page)
        const startIndex = (this.currentProductPage - 1) * this.itemsPerPage;
        this.recentProducts = enhancedProducts.slice(startIndex, startIndex + this.itemsPerPage);
        
        // Generate pagination
        this.productPages = this.generatePageNumbers(this.totalProducts, this.itemsPerPage);
        this.isLoading.products = false;
      },
      error: (error) => {
        console.error('Error processing products:', error);
        this.recentProducts = [];
        this.totalProducts = 0;
        this.isLoading.products = false;
      }
    });
  }

  loadRecentOrders(): void {
    this.isLoading.orders = true;
    this.dashboardService.getOrders(this.currentOrderPage, this.itemsPerPage).subscribe({
      next: (data) => {
        this.recentOrders = data.orders;
        this.totalOrders = data.total;
        this.orderPages = this.generatePageNumbers(this.totalOrders, this.itemsPerPage);
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
    
    // Use CategoryService directly
    this.categoryService.getAllCategories(false).pipe(
      catchError(error => {
        console.error('Error loading categories:', error);
        return of([]);
      })
    ).subscribe({
      next: (categories) => {
        // Calculate total number of categories
        this.totalCategories = categories.length;
        
        // Calculate pagination and get current page slice
        const startIndex = (this.currentCategoryPage - 1) * this.itemsPerPage;
        this.recentCategories = categories.slice(startIndex, startIndex + this.itemsPerPage);
        this.categoryPages = this.generatePageNumbers(this.totalCategories, this.itemsPerPage);
        this.isLoading.categories = false;
      },
      error: (error) => {
        console.error('Error processing categories:', error);
        this.recentCategories = [];
        this.isLoading.categories = false;
      }
    });
  }

  loadRecentUsers(): void {
    this.isLoading.users = true;
    
    this.userService.getAllUsers().pipe(
      catchError(error => {
        console.error('Error loading users:', error);
        return of([]); // Return empty array on error
      })
    ).subscribe({
      next: (users) => {
        // Calculate pagination
        this.totalUsers = users.length;
        const startIndex = (this.currentUserPage - 1) * this.itemsPerPage;
        this.recentUsers = users.slice(startIndex, startIndex + this.itemsPerPage);
        this.userPages = this.generatePageNumbers(this.totalUsers, this.itemsPerPage);
        this.isLoading.users = false;
      },
      error: (error) => {
        console.error('Error processing users:', error);
        this.recentUsers = [];
        this.totalUsers = 0;
        this.userPages = [];
        this.isLoading.users = false;
      }
    });
  }
  
  // Helper to generate page numbers
  generatePageNumbers(totalItems: number, itemsPerPage: number): number[] {
    const pageCount = Math.ceil(totalItems / itemsPerPage);
    return Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5); // Show max 5 page numbers
  }

  goToPage(type: 'products' | 'orders' | 'users' | 'categories', page: number): void {
    if (type === 'products') {
      this.currentProductPage = page;
      
      // For client-side pagination of products
      this.isLoading.products = true;
      
      // Get all products again (or use cached products if available)
      this.productService.getAllProducts().pipe(
        catchError(error => {
          console.error('Error loading products for pagination:', error);
          return of({
            products: [],
            total: 0,
            page: 1,
            limit: 10
          });
        })
      ).subscribe({
        next: (response) => {
          const allProducts = response.products;
          
          // Add category names
          const enhancedProducts = allProducts.map(product => ({
            ...product,
            categoryName: product.categoryName || 
                         (product.categoryId ? this.categoryService.getCategoryNameById(product.categoryId) : 'Unknown'),
            stockQuantity: product.stockQuantity || 0
          }));
          
          this.totalProducts = enhancedProducts.length;
          
          // Get current page items
          const startIndex = (this.currentProductPage - 1) * this.itemsPerPage;
          this.recentProducts = enhancedProducts.slice(startIndex, startIndex + this.itemsPerPage);
          
          this.isLoading.products = false;
        },
        error: () => {
          this.isLoading.products = false;
        }
      });
    } else if (type === 'orders') {
      // Existing orders pagination code
      this.currentOrderPage = page;
      this.loadRecentOrders();
    } else if (type === 'users') {
      // Existing users pagination code
      this.currentUserPage = page;
      this.loadRecentUsers();
    } else if (type === 'categories') {
      // Existing categories pagination code
      this.currentCategoryPage = page;
      this.loadRecentCategories();
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