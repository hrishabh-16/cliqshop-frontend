import { Component, OnInit, HostListener, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { CategoryService } from '../../services/category/category.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { Title, Meta } from '@angular/platform-browser';
import { ProductDetailService } from '../../services/product-detail/product-detail.service';
import { of, Subscription, interval } from 'rxjs';
import { catchError, switchMap, takeWhile } from 'rxjs/operators';

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
  stockQuantity?: number;
  [key: string]: any;
}

@Component({
  selector: 'app-product-detail',
  standalone: false,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  product: Product | null = null;
  relatedProducts: Product[] = [];
  categories: Category[] = [];
  quantity: number = 1;
  activeTab: string = 'details';
  showScrollTop: boolean = false;
  
  // NEW: Real-time inventory tracking
  private inventoryCheckInterval?: Subscription;
  private inventoryUpdateSubscription?: Subscription;
  private subscriptions: Subscription[] = [];
  
  @ViewChild('mainImage') mainImage?: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private productDetailService: ProductDetailService,
    private cartService: CartService,
    private authService: AuthService,
    private categoryService: CategoryService,
    private inventoryService: InventoryService, // NEW: Inject inventory service
    private titleService: Title,
    private metaService: Meta
  ) { }

  ngOnInit(): void {
    // Load categories first
    this.loadCategories();
    
    // Then load product from route
    this.loadProductFromRoute();
    
    // NEW: Subscribe to inventory updates
    this.subscribeToInventoryUpdates();
    
    // NEW: Start real-time inventory checking
    this.startRealTimeInventoryCheck();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.inventoryCheckInterval) {
      this.inventoryCheckInterval.unsubscribe();
    }
    if (this.inventoryUpdateSubscription) {
      this.inventoryUpdateSubscription.unsubscribe();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadCategories(): void {
    const sub = this.categoryService.getAllCategories().pipe(
      catchError(error => {
        console.error('Failed to load categories:', error);
        return of([]);
      })
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories loaded in product detail:', categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categories = [];
      }
    });
    
    this.subscriptions.push(sub);
  }

  // Create Product instance from API response - using same approach as admin
  private createProductFromApi(apiProduct: ApiProductResponse): Product {
    const categoryName = apiProduct.category?.name || 
                        apiProduct.categoryName || 
                        this.getCategoryName(apiProduct.category?.categoryId || apiProduct.categoryId || 0);
    
    return new Product(
      apiProduct.productId,
      apiProduct.name,
      apiProduct.description,
      apiProduct.price,
      apiProduct.imageUrl,
      apiProduct.category?.categoryId || apiProduct.categoryId || 0,
      categoryName,
      apiProduct.inventory?.quantity || apiProduct.stockQuantity || 10, // Default to 10 if not available
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

  loadProductFromRoute(): void {
    this.isLoading = true;
    
    const sub = this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.loadProductDetails(parseInt(productId, 10));
      } else {
        this.isLoading = false;
        this.router.navigate(['/products']);
      }
    });
    
    this.subscriptions.push(sub);
  }

  loadProductDetails(productId: number): void {
    // Use the productDetailService to get more detailed product information
    const sub = this.productDetailService.getProductDetails(productId).subscribe({
      next: (apiResponse) => {
        console.log('Product details loaded:', apiResponse);
        
        // Create product from API response
        this.product = this.createProductFromApi(apiResponse as ApiProductResponse);
        
        // Double check: Make sure the product has a valid stock quantity
        if (this.product && this.product.stockQuantity === undefined) {
          console.log('Setting fallback stock quantity in component');
          this.product.stockQuantity = 10; // Ensure a positive number for stock
        }
        
        // Update page metadata
        this.updatePageMetadata();
        
        // Load related products
        if (this.product.categoryId) {
          this.loadRelatedProducts(this.product.categoryId, this.product.productId);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        this.isLoading = false;
        this.product = null;
      }
    });
    
    this.subscriptions.push(sub);
  }

  loadRelatedProducts(categoryId: number, currentProductId: number): void {
    const sub = this.productService.getProductsByCategory(categoryId).subscribe({
      next: (products) => {
        // Map the products using the same approach
        const mappedProducts = products.map((apiProduct: any) => 
          this.createProductFromApi(apiProduct as ApiProductResponse)
        );
        
        // Filter out the current product and limit to 4 related products
        this.relatedProducts = mappedProducts
          .filter(product => product.productId !== currentProductId)
          .slice(0, 4);
        
        // Ensure all related products have stockQuantity defined
        this.relatedProducts = this.relatedProducts.map(product => {
          if (product.stockQuantity === undefined) {
            return {...product, stockQuantity: Math.floor(Math.random() * 20) + 5}; // Default 5-25
          }
          return product;
        });
        
        console.log('Related products loaded:', this.relatedProducts);
      },
      error: (error) => {
        console.error('Error loading related products:', error);
        this.relatedProducts = [];
      }
    });
    
    this.subscriptions.push(sub);
  }

  updatePageMetadata(): void {
    if (this.product) {
      // Update page title
      this.titleService.setTitle(`${this.product.name} | CliQShop`);
      
      // Update meta tags
      this.metaService.updateTag({ name: 'description', content: this.product.description.substring(0, 160) });
      
      // Add product structured data for SEO (JSON-LD)
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: this.product.name,
        description: this.product.description,
        image: this.product.imageUrl,
        offers: {
          '@type': 'Offer',
          price: this.product.price,
          priceCurrency: 'INR',
          availability: this.product.stockQuantity !== undefined && this.product.stockQuantity > 0 ? 
            'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        }
      };
      
      // Remove existing JSON-LD if any
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Add new JSON-LD
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }

  // NEW: Subscribe to inventory updates for real-time stock changes
  private subscribeToInventoryUpdates(): void {
    this.inventoryUpdateSubscription = this.inventoryService.getInventoryUpdates().subscribe(updates => {
      if (this.product && updates.length > 0) {
        const productUpdate = updates.find(update => update.productId === this.product!.productId);
        if (productUpdate) {
          console.log(`Real-time inventory update for product ${this.product.productId}:`, productUpdate);
          this.product.stockQuantity = productUpdate.quantity;
          
          // Show notification about stock change
          if (productUpdate.operation === 'decrement') {
            this.showNotification(`Stock updated: ${productUpdate.quantity} remaining`, 'info');
          }
        }
      }
    });
  }

  // NEW: Start periodic inventory checking (every 30 seconds)
  private startRealTimeInventoryCheck(): void {
    // Check every 30 seconds
    this.inventoryCheckInterval = interval(30000).pipe(
      takeWhile(() => !!this.product), // Stop when product is null
      switchMap(() => {
        if (this.product) {
          return this.inventoryService.checkRealTimeInventory(this.product.productId);
        }
        return of(0);
      }),
      catchError(error => {
        console.error('Error during real-time inventory check:', error);
        return of(0);
      })
    ).subscribe(currentStock => {
      if (this.product && currentStock !== this.product.stockQuantity) {
        console.log(`Real-time stock check: Product ${this.product.productId} stock changed from ${this.product.stockQuantity} to ${currentStock}`);
        
        const previousStock = this.product.stockQuantity || 0;
        this.product.stockQuantity = currentStock;
        
        // Show notification about stock change
        if (currentStock < previousStock) {
          this.showNotification(`Stock updated: ${currentStock} remaining`, 'info');
        } else if (currentStock > previousStock) {
          this.showNotification(`Stock replenished: ${currentStock} available`, 'success');
        }
      }
    });
  }

  // NEW: Force refresh inventory for current product
  refreshInventory(): void {
    if (!this.product) return;
    
    console.log(`Manually refreshing inventory for product ${this.product.productId}`);
    
    const sub = this.inventoryService.checkRealTimeInventory(this.product.productId).subscribe({
      next: (currentStock) => {
        if (this.product) {
          const previousStock = this.product.stockQuantity || 0;
          this.product.stockQuantity = currentStock;
          
          if (currentStock !== previousStock) {
            this.showNotification(`Stock refreshed: ${currentStock} available`, 'success');
          } else {
            this.showNotification('Stock verified - no changes', 'info');
          }
        }
      },
      error: (error) => {
        console.error('Error refreshing inventory:', error);
        this.showNotification('Unable to refresh stock information', 'error');
      }
    });
    
    this.subscriptions.push(sub);
  }

  increaseQuantity(): void {
    // Check if product exists and has stock quantity defined
    if (this.product && 
        this.product.stockQuantity !== undefined && 
        this.product.stockQuantity > 0 &&
        this.quantity < this.product.stockQuantity) {
      this.quantity++;
      console.log('Increased quantity to:', this.quantity);
    } else {
      console.log('Cannot increase quantity - stock constraints:', 
        this.product ? `Stock: ${this.product.stockQuantity}, Current: ${this.quantity}` : 'No product');
      
      // Show notification if at stock limit
      if (this.product && this.product.stockQuantity !== undefined && this.quantity >= this.product.stockQuantity) {
        this.showNotification(`Maximum available quantity: ${this.product.stockQuantity}`, 'warning');
      }
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
      console.log('Decreased quantity to:', this.quantity);
    } else {
      console.log('Cannot decrease quantity below 1');
    }
  }

  isProductInStock(): boolean {
    return !!this.product && 
           this.product.stockQuantity !== undefined && 
           this.product.stockQuantity > 0;
  }

  getDiscountPercentage(): number {
    if (!this.product || !this.product.productId) return 0;
    
    // Use the same logic as in the product component for consistency
    if (this.product.productId % 3 === 0) {
      return 20; // 20% off
    } else if (this.product.productId % 5 === 0) {
      return 15; // 15% off  
    }
    return 0;
  }

  getRelatedProductDiscountPercentage(product: Product): number {
    if (!product || !product.productId) return 0;
    
    // Same discount logic
    if (product.productId % 3 === 0) {
      return 20; // 20% off
    } else if (product.productId % 5 === 0) {
      return 15; // 15% off  
    }
    return 0;
  }

  addToCart(): void {
    if (!this.product) {
      console.error('Cannot add to cart: Product is null');
      return;
    }
    
    // Check if product is in stock
    if (!this.isProductInStock()) {
      this.showNotification('Sorry, this product is out of stock', 'error');
      return;
    }
    
    // Check if requested quantity is available
    if (this.quantity > (this.product.stockQuantity || 0)) {
      this.showNotification(`Only ${this.product.stockQuantity} items available`, 'error');
      return;
    }
    
    const user = this.authService.getCurrentUser();
    
    if (user) {
      const sub = this.cartService.addToCart(user.userId, this.product.productId, this.quantity).subscribe({
        next: (response) => {
          console.log('Product added to cart:', response);
          this.showNotification(`${this.product?.name} added to cart!`, 'success');
          
          // NEW: After adding to cart, refresh inventory to show updated stock
          setTimeout(() => {
            this.refreshInventory();
          }, 1000);
        },
        error: (error) => {
          console.error('Error adding product to cart:', error);
          this.showNotification('Failed to add product to cart', 'error');
        }
      });
      
      this.subscriptions.push(sub);
    } else {
      // Redirect to login if not logged in
      this.router.navigate(['/login'], { 
        queryParams: { 
          returnUrl: `/products/${this.product.productId}` 
        }
      });
    }
  }

  // Helper method to show a notification with different types
  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    
    let bgColor = 'bg-green-500';
    let icon = '✓';
    
    switch (type) {
      case 'error':
        bgColor = 'bg-red-500';
        icon = '✗';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        icon = '⚠';
        break;
      case 'info':
        bgColor = 'bg-blue-500';
        icon = 'ℹ';
        break;
      default:
        bgColor = 'bg-green-500';
        icon = '✓';
    }
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-0`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `<span class="mr-2">${icon}</span>${message}`;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}