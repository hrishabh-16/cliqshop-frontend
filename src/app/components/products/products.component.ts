// import { Component, OnInit, HostListener } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { Product } from '../../models/product.model';
// import { Category } from '../../models/category.model';
// import { ProductService } from '../../services/product/product.service';
// import { CategoryService } from '../../services/category/category.service';
// import { CartService } from '../../services/cart/cart.service';
// import { AuthService } from '../../services/auth/auth.service';
// import { HttpClient } from '@angular/common/http';

// @Component({
//   standalone: false,
//   selector: 'app-products',
//   templateUrl: './products.component.html',
//   styleUrls: ['./products.component.css']
// })
// export class ProductsComponent implements OnInit {
//   isLoading: boolean = true;
//   allProducts: Product[] = [];
//   filteredProducts: Product[] = [];
//   categories: Category[] = [];
  
//   // Search and filter properties
//   searchQuery: string = '';
//   selectedCategories: number[] = [];
//   minPrice: number | null = null;
//   maxPrice: number | null = null;
//   showInStock: boolean = true;
//   showOutOfStock: boolean = true;
//   showMobileFilters: boolean = false;
  
//   // Sorting options
//   sortOption: string = 'relevance';
  
//   // Pagination
//   currentPage: number = 1;
//   itemsPerPage: number = 12;
//   totalPages: number = 1;
  
//   // UI state
//   showScrollTop: boolean = false;

//   constructor(
//     private productService: ProductService,
//     private categoryService: CategoryService,
//     private cartService: CartService,
//     private authService: AuthService,
//     private http: HttpClient,
//     private route: ActivatedRoute,
//     private router: Router
//   ) { }

//   ngOnInit(): void {
//     this.loadCategories();

//     // Check for query parameters (category selection, search, etc.)
//     this.route.queryParams.subscribe(params => {
//       const categoryId = params['category'];
//       const search = params['search'];
      
//       if (categoryId) {
//         this.selectedCategories = [parseInt(categoryId)];
//       }
      
//       if (search) {
//         this.searchQuery = search;
//       }
      
//       // Load products after processing query params
//       this.loadProducts();
//     });
//   }

//   @HostListener('window:scroll', [])
//   onWindowScroll(): void {
//     this.showScrollTop = window.scrollY > 500;
//   }

//   scrollToTop(): void {
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   }

//   loadCategories(): void {
//     this.categoryService.getAllCategories().subscribe({
//       next: (categories) => {
//         this.categories = categories;
//         console.log('Categories loaded:', categories);
//       },
//       error: (error) => {
//         console.error('Error loading categories:', error);
//       }
//     });
//   }

//   loadProducts(): void {
//     this.isLoading = true;
    
//     // If a category is selected, load products for that category
//     if (this.selectedCategories.length === 1) {
//       const categoryId = this.selectedCategories[0];
//       console.log('Loading products for category:', categoryId);
      
//       this.productService.getProductsByCategory(categoryId).subscribe({
//         next: (products) => {
//           this.allProducts = products;
//           this.totalPages = Math.ceil(this.allProducts.length / this.itemsPerPage);
//           this.applyFilters();
//           this.isLoading = false;
//         },
//         error: (error) => {
//           console.error('Error loading products for category:', error);
//           this.isLoading = false;
          
//           // Fallback to loading all products if category-specific request fails
//           this.loadAllProducts();
//         }
//       });
//     } else {
//       // Load all products if no category is selected
//       this.loadAllProducts();
//     }
//   }
  
//   loadAllProducts(): void {
//     this.productService.getAllProducts().subscribe({
//       next: (response) => {
//         if (Array.isArray(response)) {
//           // Direct array response
//           this.allProducts = response;
//           this.totalPages = Math.ceil(this.allProducts.length / this.itemsPerPage);
//         } else if (response.products) {
//           // Response with pagination object
//           this.allProducts = response.products;
//           this.totalPages = Math.ceil(response.total / this.itemsPerPage);
//         } else {
//           this.allProducts = [];
//           this.totalPages = 1;
//         }
        
//         this.applyFilters();
//         this.isLoading = false;
//       },
//       error: (error) => {
//         console.error('Error loading products:', error);
//         this.isLoading = false;
//         this.allProducts = [];
//         this.filteredProducts = [];
//       }
//     });
//   }

//   searchProducts(): void {
//     if (!this.searchQuery.trim()) {
//       this.loadProducts();
//       return;
//     }

//     this.isLoading = true;
//     this.productService.searchProducts(this.searchQuery).subscribe({
//       next: (products) => {
//         this.allProducts = products;
//         this.applyFilters();
//         this.isLoading = false;
        
//         // Update URL with search parameter
//         this.router.navigate([], {
//           relativeTo: this.route,
//           queryParams: { search: this.searchQuery },
//           queryParamsHandling: 'merge'
//         });
//       },
//       error: (error) => {
//         console.error('Error searching products:', error);
//         this.isLoading = false;
//       }
//     });
//   }

//   toggleCategory(categoryId: number): void {
//     console.log('Toggling category:', categoryId);
//     const index = this.selectedCategories.indexOf(categoryId);
    
//     if (index > -1) {
//       // Remove the category
//       this.selectedCategories.splice(index, 1);
//     } else {
//       // Add the category
//       this.selectedCategories.push(categoryId);
//     }
    
//     console.log('Selected categories after toggle:', this.selectedCategories);
    
//     // Load products based on the updated category selection
//     this.loadProducts();
    
//     // Update URL with category parameter if there's only one selected
//     if (this.selectedCategories.length === 1) {
//       this.router.navigate([], {
//         relativeTo: this.route,
//         queryParams: { category: this.selectedCategories[0] },
//         queryParamsHandling: 'merge'
//       });
//     } else if (this.selectedCategories.length === 0) {
//       // Remove category param if no categories selected
//       this.router.navigate([], {
//         relativeTo: this.route,
//         queryParams: { category: null },
//         queryParamsHandling: 'merge'
//       });
//     }
//   }

//   applyFilters(): void {
//     console.log('Applying filters with products:', this.allProducts.length);
//     let filtered = [...this.allProducts];
    
//     // Filter by category - only needed if we load all products first
//     if (this.selectedCategories.length > 0 && !this.route.snapshot.queryParams['category']) {
//       console.log('Filtering by categories:', this.selectedCategories);
//       filtered = filtered.filter(product => 
//         this.selectedCategories.includes(product.categoryId)
//       );
//     }
    
//     // Filter by price
//     if (this.minPrice !== null) {
//       filtered = filtered.filter(product => product.price >= (this.minPrice || 0));
//     }
    
//     if (this.maxPrice !== null) {
//       filtered = filtered.filter(product => product.price <= (this.maxPrice || Infinity));
//     }
    
//     // Filter by stock status
//     if (!this.showInStock && this.showOutOfStock) {
//       filtered = filtered.filter(product => product.stockQuantity === 0);
//     } else if (this.showInStock && !this.showOutOfStock) {
//       filtered = filtered.filter(product => (product.stockQuantity ?? 0) > 0);
//     } else if (!this.showInStock && !this.showOutOfStock) {
//       filtered = []; // Show no products if both are unchecked
//     }
    
//     // Apply sorting
//     this.applySorting(filtered);
    
//     // Apply pagination
//     this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
//     const startIndex = (this.currentPage - 1) * this.itemsPerPage;
//     this.filteredProducts = filtered.slice(startIndex, startIndex + this.itemsPerPage);
    
//     console.log('Filtered products count:', this.filteredProducts.length);
//   }
  
//   applySorting(products: Product[]): void {
//     switch (this.sortOption) {
//       case 'priceLowToHigh':
//         products.sort((a, b) => a.price - b.price);
//         break;
//       case 'priceHighToLow':
//         products.sort((a, b) => b.price - a.price);
//         break;
//       case 'newest':
//         products.sort((a, b) => {
//           if (a.createdAt && b.createdAt) {
//             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
//           }
//           return 0;
//         });
//         break;
//       default:
//         // Default sorting (relevance) - no specific order
//         break;
//     }
//   }

//   sortProducts(): void {
//     this.applyFilters();
//   }

//   resetFilters(): void {
//     this.selectedCategories = [];
//     this.minPrice = null;
//     this.maxPrice = null;
//     this.showInStock = true;
//     this.showOutOfStock = true;
//     this.searchQuery = '';
//     this.sortOption = 'relevance';
//     this.currentPage = 1;
    
//     // Clear URL parameters
//     this.router.navigate([], {
//       relativeTo: this.route,
//       queryParams: {}
//     });
    
//     this.loadProducts();
//   }

//   toggleMobileFilters(): void {
//     this.showMobileFilters = !this.showMobileFilters;
//   }

//   // Add to cart functionality
//   addToCart(product: Product): void {
//     const user = this.authService.getCurrentUser();
//     if (product.stockQuantity === 0) {
//       // Don't allow adding out-of-stock items
//       this.showNotification('Sorry, this product is out of stock');
//       return;
//     }
    
//     if (user) {
//       this.cartService.addToCart(user.userId, product.productId, 1).subscribe({
//         next: (response) => {
//           console.log('Product added to cart:', response);
//           this.showNotification(`${product.name} added to cart!`);
//         },
//         error: (error) => {
//           console.error('Error adding product to cart:', error);
//           this.showNotification('Failed to add product to cart');
//         }
//       });
//     } else {
//       this.router.navigate(['/login']);
//     }
//   }

//   // Helper method to show a notification (this is a simple implementation)
//   showNotification(message: string): void {
//     // This is a placeholder - in a real app, you'd integrate a proper notification system
//     console.log('Notification:', message);
    
//     // Create a temporary notification element
//     const notification = document.createElement('div');
//     notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slideInRight';
//     notification.textContent = message;
    
//     document.body.appendChild(notification);
    
//     // Remove after 3 seconds
//     setTimeout(() => {
//       notification.classList.add('animate-fadeOut');
//       setTimeout(() => {
//         document.body.removeChild(notification);
//       }, 500);
//     }, 3000);
//   }

//   // Get discount percentage for products
//   getDiscountPercentage(product: Product): number {
//     if (!product.price) return 0;
    
//     // This is a dummy implementation - in a real app, we'd check if product has a sale price
//     // For demo purposes, give random discounts to some products
//     if (product.productId % 3 === 0) {
//       return 20; // 20% off
//     } else if (product.productId % 5 === 0) {
//       return 15; // 15% off  
//     }
//     return 0;
//   }

//   // Pagination controls
//   previousPage(): void {
//     if (this.currentPage > 1) {
//       this.currentPage--;
//       this.applyFilters();
//       this.scrollToTop();
//     }
//   }

//   nextPage(): void {
//     if (this.currentPage < this.totalPages) {
//       this.currentPage++;
//       this.applyFilters();
//       this.scrollToTop();
//     }
//   }
// }
import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { ProductService } from '../../services/product/product.service';
import { CategoryService } from '../../services/category/category.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ApiProductResponse {
  productId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: {
    categoryId: number;
    name: string;
    description: string;
  };
  inventory?: any;
  categoryId?: number;
  categoryName?: string;
  [key: string]: any;
}

@Component({
  standalone: false,
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
      
      // Load products after processing query params
      this.loadProducts();
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
    this.categoryService.getAllCategories().pipe(
      catchError(error => {
        console.error('Failed to load categories:', error);
        return of([]);
      })
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories loaded:', categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categories = [];
      }
    });
  }

  // Create Product instance from API response - using same approach as admin
  private createProductFromApi(apiProduct: ApiProductResponse): Product {
    return new Product(
      apiProduct.productId,
      apiProduct.name,
      apiProduct.description,
      apiProduct.price,
      apiProduct.imageUrl,
      apiProduct.category?.categoryId || apiProduct.categoryId || 0,
      apiProduct.category?.name || apiProduct.categoryName || this.getCategoryName(apiProduct.category?.categoryId || apiProduct.categoryId || 0),
      apiProduct.inventory?.quantity || apiProduct['stockQuantity'],
      false, // selected
      apiProduct['createdAt'] ? new Date(apiProduct['createdAt']) : undefined,
      apiProduct['updatedAt'] ? new Date(apiProduct['updatedAt']) : undefined,
      apiProduct['sku'],
      apiProduct['isActive'],
      apiProduct['brand']
    );
  }

  // Helper method to find category name by ID - same as admin component
  getCategoryName(categoryId: number): string {
    if (!categoryId || isNaN(categoryId)) return 'Unknown';

    // Check loaded categories first
    const category = this.categories.find(c => 
      c.categoryId === categoryId || c.id === categoryId
    );
    if (category?.name) return category.name;

    // Try category service
    try {
      const categoryName = this.categoryService.getCategoryNameById(categoryId);
      if (categoryName && categoryName !== 'Unknown') return categoryName;
    } catch (error) {
      console.warn('Error getting category name from service:', error);
    }

    return 'Unknown';
  }

  // Map API products response - using same approach as admin
  private mapApiProducts(response: any): Product[] {
    let products: Product[] = [];
    
    if (Array.isArray(response)) {
      products = response.map((item: ApiProductResponse) => this.createProductFromApi(item));
    } else if (response?.products) {
      products = response.products.map((item: ApiProductResponse) => this.createProductFromApi(item));
    } else if (response?.content) {
      products = response.content.map((item: ApiProductResponse) => this.createProductFromApi(item));
    }
    
    return products;
  }

  loadProducts(): void {
    this.isLoading = true;
    
    // If a category is selected, load products for that category
    if (this.selectedCategories.length === 1) {
      const categoryId = this.selectedCategories[0];
      console.log('Loading products for category:', categoryId);
      
      this.productService.getProductsByCategory(categoryId).subscribe({
        next: (products) => {
          this.allProducts = this.mapApiProducts(products);
          this.totalPages = Math.ceil(this.allProducts.length / this.itemsPerPage);
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading products for category:', error);
          this.isLoading = false;
          
          // Fallback to loading all products if category-specific request fails
          this.loadAllProducts();
        }
      });
    } else {
      // Load all products if no category is selected
      this.loadAllProducts();
    }
  }
  
  loadAllProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        this.allProducts = this.mapApiProducts(response);
        this.totalPages = Math.ceil(this.allProducts.length / this.itemsPerPage);
        
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
        this.allProducts = this.mapApiProducts(products);
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
    console.log('Toggling category:', categoryId);
    const index = this.selectedCategories.indexOf(categoryId);
    
    if (index > -1) {
      // Remove the category
      this.selectedCategories.splice(index, 1);
    } else {
      // Add the category
      this.selectedCategories.push(categoryId);
    }
    
    console.log('Selected categories after toggle:', this.selectedCategories);
    
    // Load products based on the updated category selection
    this.loadProducts();
    
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
    console.log('Applying filters with products:', this.allProducts.length);
    let filtered = [...this.allProducts];
    
    // Filter by category - only needed if we load all products first
    if (this.selectedCategories.length > 0 && !this.route.snapshot.queryParams['category']) {
      console.log('Filtering by categories:', this.selectedCategories);
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
    
    console.log('Filtered products count:', this.filteredProducts.length);
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