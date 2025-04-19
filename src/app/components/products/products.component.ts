import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { ProductService } from '../../services/product/product.service';
import { CategoryService } from '../../services/category/category.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone:false,
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  isLoading: boolean = true;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  
  // Search and filter properties
  searchQuery: string = '';
  selectedCategories: number[] = [];
  minPrice: number | null = null;
  maxPrice: number | null = null;
  showInStock: boolean = true;
  showOutOfStock: boolean = true;
  showMobileFilters: boolean = false;
  
  // Sorting options
  sortOption: string = 'relevance';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 12;
  totalPages: number = 1;
  
  // UI state
  showScrollTop: boolean = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();

    // Check for query parameters (category selection, search, etc.)
    this.route.queryParams.subscribe(params => {
      const categoryId = params['category'];
      const search = params['search'];
      
      if (categoryId) {
        this.selectedCategories = [parseInt(categoryId)];
      }
      
      if (search) {
        this.searchQuery = search;
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories loaded:', categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          // Direct array response
          this.allProducts = response;
          this.totalPages = Math.ceil(this.allProducts.length / this.itemsPerPage);
        } else if (response.products) {
          // Response with pagination object
          this.allProducts = response.products;
          this.totalPages = Math.ceil(response.total / this.itemsPerPage);
        } else {
          this.allProducts = [];
          this.totalPages = 1;
        }
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
        this.allProducts = [];
        this.filteredProducts = [];
      }
    });
  }

  searchProducts(): void {
    if (!this.searchQuery.trim()) {
      this.loadProducts();
      return;
    }

    this.isLoading = true;
    this.productService.searchProducts(this.searchQuery).subscribe({
      next: (products) => {
        this.allProducts = products;
        this.applyFilters();
        this.isLoading = false;
        
        // Update URL with search parameter
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { search: this.searchQuery },
          queryParamsHandling: 'merge'
        });
      },
      error: (error) => {
        console.error('Error searching products:', error);
        this.isLoading = false;
      }
    });
  }

  toggleCategory(categoryId: number): void {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(categoryId);
    }
    this.applyFilters();
    
    // Update URL with category parameter if there's only one selected
    if (this.selectedCategories.length === 1) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: this.selectedCategories[0] },
        queryParamsHandling: 'merge'
      });
    } else if (this.selectedCategories.length === 0) {
      // Remove category param if no categories selected
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  applyFilters(): void {
    let filtered = [...this.allProducts];
    
    // Filter by category
    if (this.selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        this.selectedCategories.includes(product.categoryId)
      );
    }
    
    // Filter by price
    if (this.minPrice !== null) {
      filtered = filtered.filter(product => product.price >= (this.minPrice || 0));
    }
    
    if (this.maxPrice !== null) {
      filtered = filtered.filter(product => product.price <= (this.maxPrice || Infinity));
    }
    
    // Filter by stock status
    if (!this.showInStock && this.showOutOfStock) {
      filtered = filtered.filter(product => product.stockQuantity === 0);
    } else if (this.showInStock && !this.showOutOfStock) {
      filtered = filtered.filter(product => (product.stockQuantity ?? 0) > 0);
    } else if (!this.showInStock && !this.showOutOfStock) {
      filtered = []; // Show no products if both are unchecked
    }
    
    // Apply sorting
    this.applySorting(filtered);
    
    // Apply pagination
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredProducts = filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  applySorting(products: Product[]): void {
    switch (this.sortOption) {
      case 'priceLowToHigh':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'priceHighToLow':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        products.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0;
        });
        break;
      default:
        // Default sorting (relevance) - no specific order
        break;
    }
  }

  sortProducts(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCategories = [];
    this.minPrice = null;
    this.maxPrice = null;
    this.showInStock = true;
    this.showOutOfStock = true;
    this.searchQuery = '';
    this.sortOption = 'relevance';
    this.currentPage = 1;
    
    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
    
    this.loadProducts();
  }

  toggleMobileFilters(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  // Add to cart functionality
  addToCart(product: Product): void {
    const user = this.authService.getCurrentUser();
    if (product.stockQuantity === 0) {
      // Don't allow adding out-of-stock items
      this.showNotification('Sorry, this product is out of stock');
      return;
    }
    
    if (user) {
      this.cartService.addToCart(user.userId, product.productId, 1).subscribe({
        next: (response) => {
          console.log('Product added to cart:', response);
          this.showNotification(`${product.name} added to cart!`);
        },
        error: (error) => {
          console.error('Error adding product to cart:', error);
          this.showNotification('Failed to add product to cart');
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  // Helper method to show a notification (this is a simple implementation)
  showNotification(message: string): void {
    // This is a placeholder - in a real app, you'd integrate a proper notification system
    console.log('Notification:', message);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slideInRight';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('animate-fadeOut');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }

  // Get discount percentage for products
  getDiscountPercentage(product: Product): number {
    if (!product.price) return 0;
    
    // This is a dummy implementation - in a real app, we'd check if product has a sale price
    // For demo purposes, give random discounts to some products
    if (product.productId % 3 === 0) {
      return 20; // 20% off
    } else if (product.productId % 5 === 0) {
      return 15; // 15% off  
    }
    return 0;
  }

  // Pagination controls
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
      this.scrollToTop();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
      this.scrollToTop();
    }
  }
}