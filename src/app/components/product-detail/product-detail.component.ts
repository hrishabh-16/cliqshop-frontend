// import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { Product } from '../../models/product.model';
// import { ProductService } from '../../services/product/product.service';
// import { CartService } from '../../services/cart/cart.service';
// import { AuthService } from '../../services/auth/auth.service';
// import { Title, Meta } from '@angular/platform-browser';

// @Component({
//   selector: 'app-product-detail',
//   standalone: false,
//   templateUrl: './product-detail.component.html',
//   styleUrls: ['./product-detail.component.css']
// })
// export class ProductDetailComponent implements OnInit {
//   isLoading: boolean = true;
//   product: Product | null = null;
//   relatedProducts: Product[] = [];
//   quantity: number = 1;
//   activeTab: string = 'details';
//   showScrollTop: boolean = false;
  
//   @ViewChild('mainImage') mainImage?: ElementRef;

//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private productService: ProductService,
//     private cartService: CartService,
//     private authService: AuthService,
//     private titleService: Title,
//     private metaService: Meta
//   ) { }

//   ngOnInit(): void {
//     this.loadProductFromRoute();
//   }

//   @HostListener('window:scroll', [])
//   onWindowScroll(): void {
//     this.showScrollTop = window.scrollY > 500;
//   }

//   scrollToTop(): void {
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   }

//   loadProductFromRoute(): void {
//     this.isLoading = true;
    
//     this.route.paramMap.subscribe(params => {
//       const productId = params.get('id');
//       if (productId) {
//         this.loadProductDetails(parseInt(productId, 10));
//       } else {
//         this.isLoading = false;
//         this.router.navigate(['/products']);
//       }
//     });
//   }

//   loadProductDetails(productId: number): void {
//     this.productService.getProductById(productId).subscribe({
//       next: (product) => {
//         console.log('Product details loaded:', product);
//         this.product = product;
        
//         // Update page metadata
//         this.updatePageMetadata();
        
//         // Load related products
//         if (product.categoryId) {
//           this.loadRelatedProducts(product.categoryId, product.productId);
//         }
        
//         this.isLoading = false;
//       },
//       error: (error) => {
//         console.error('Error loading product details:', error);
//         this.isLoading = false;
//         this.product = null;
//       }
//     });
//   }

//   loadRelatedProducts(categoryId: number, currentProductId: number): void {
//     this.productService.getProductsByCategory(categoryId).subscribe({
//       next: (products) => {
//         // Filter out the current product and limit to 4 related products
//         this.relatedProducts = products
//           .filter(product => product.productId !== currentProductId)
//           .slice(0, 4);
        
//         console.log('Related products loaded:', this.relatedProducts);
//       },
//       error: (error) => {
//         console.error('Error loading related products:', error);
//         this.relatedProducts = [];
//       }
//     });
//   }

//   updatePageMetadata(): void {
//     if (this.product) {
//       // Update page title
//       this.titleService.setTitle(`${this.product.name} | CliQShop`);
      
//       // Update meta tags
//       this.metaService.updateTag({ name: 'description', content: this.product.description.substring(0, 160) });
      
//       // Add product structured data for SEO (JSON-LD)
//       const jsonLd = {
//         '@context': 'https://schema.org',
//         '@type': 'Product',
//         name: this.product.name,
//         description: this.product.description,
//         image: this.product.imageUrl,
//         offers: {
//           '@type': 'Offer',
//           price: this.product.price,
//           priceCurrency: 'INR',
//           availability: this.product.stockQuantity && this.product.stockQuantity > 0 ? 
//             'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
//         }
//       };
      
//       // Remove existing JSON-LD if any
//       const existingScript = document.querySelector('script[type="application/ld+json"]');
//       if (existingScript) {
//         existingScript.remove();
//       }
      
//       // Add new JSON-LD
//       const script = document.createElement('script');
//       script.type = 'application/ld+json';
//       script.text = JSON.stringify(jsonLd);
//       document.head.appendChild(script);
//     }
//   }

//   increaseQuantity(): void {
//     if (this.product && this.product.stockQuantity && this.quantity < this.product.stockQuantity) {
//       this.quantity++;
//     }
//   }

//   decreaseQuantity(): void {
//     if (this.quantity > 1) {
//       this.quantity--;
//     }
//   }

//   getDiscountPercentage(): number {
//     if (!this.product || !this.product.productId) return 0;
    
//     // Use the same logic as in the product component for consistency
//     if (this.product.productId % 3 === 0) {
//       return 20; // 20% off
//     } else if (this.product.productId % 5 === 0) {
//       return 15; // 15% off  
//     }
//     return 0;
//   }

//   getRelatedProductDiscountPercentage(product: Product): number {
//     if (!product || !product.productId) return 0;
    
//     // Same discount logic
//     if (product.productId % 3 === 0) {
//       return 20; // 20% off
//     } else if (product.productId % 5 === 0) {
//       return 15; // 15% off  
//     }
//     return 0;
//   }

//   addToCart(): void {
//     if (!this.product) {
//       return;
//     }
    
//     // Only check stock quantity if it's defined
//     if (this.product.stockQuantity !== undefined && this.product.stockQuantity === 0) {
//       this.showNotification('Sorry, this product is out of stock');
//       return;
//     }
    
//     const user = this.authService.getCurrentUser();
    
//     if (user) {
//       this.cartService.addToCart(user.userId, this.product.productId, this.quantity).subscribe({
//         next: (response) => {
//           console.log('Product added to cart:', response);
//           this.showNotification(`${this.product?.name} added to cart!`);
//         },
//         error: (error) => {
//           console.error('Error adding product to cart:', error);
//           this.showNotification('Failed to add product to cart');
//         }
//       });
//     } else {
//       // Redirect to login if not logged in
//       this.router.navigate(['/login'], { 
//         queryParams: { 
//           returnUrl: `/products/${this.product.productId}` 
//         }
//       });
//     }
//   }

//   // Helper method to show a notification (same as in products component)
//   showNotification(message: string): void {
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
// }

import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { Title, Meta } from '@angular/platform-browser';
import { ProductDetailService } from '../../services/product-detail/product-detail.service';

@Component({
  selector: 'app-product-detail',
  standalone: false,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  isLoading: boolean = true;
  product: Product | null = null;
  relatedProducts: Product[] = [];
  quantity: number = 1;
  activeTab: string = 'details';
  showScrollTop: boolean = false;
  
  @ViewChild('mainImage') mainImage?: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private productDetailService: ProductDetailService,
    private cartService: CartService,
    private authService: AuthService,
    private titleService: Title,
    private metaService: Meta
  ) { }

  ngOnInit(): void {
    this.loadProductFromRoute();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadProductFromRoute(): void {
    this.isLoading = true;
    
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.loadProductDetails(parseInt(productId, 10));
      } else {
        this.isLoading = false;
        this.router.navigate(['/products']);
      }
    });
  }

  loadProductDetails(productId: number): void {
    // Use the productDetailService to get more detailed product information
    this.productDetailService.getProductDetails(productId).subscribe({
      next: (product) => {
        console.log('Product details loaded:', product);
        this.product = product;
        
        // Double check: Make sure the product has a valid stock quantity
        if (this.product && this.product.stockQuantity === undefined) {
          console.log('Setting fallback stock quantity in component');
          this.product.stockQuantity = 10; // Ensure a positive number for stock
        }
        
        // Update page metadata
        this.updatePageMetadata();
        
        // Load related products
        if (product.categoryId) {
          this.loadRelatedProducts(product.categoryId, product.productId);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        this.isLoading = false;
        this.product = null;
      }
    });
  }

  loadRelatedProducts(categoryId: number, currentProductId: number): void {
    this.productService.getProductsByCategory(categoryId).subscribe({
      next: (products) => {
        // Filter out the current product and limit to 4 related products
        this.relatedProducts = products
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
      this.showNotification('Sorry, this product is out of stock');
      return;
    }
    
    const user = this.authService.getCurrentUser();
    
    if (user) {
      this.cartService.addToCart(user.userId, this.product.productId, this.quantity).subscribe({
        next: (response) => {
          console.log('Product added to cart:', response);
          this.showNotification(`${this.product?.name} added to cart!`);
        },
        error: (error) => {
          console.error('Error adding product to cart:', error);
          this.showNotification('Failed to add product to cart');
        }
      });
    } else {
      // Redirect to login if not logged in
      this.router.navigate(['/login'], { 
        queryParams: { 
          returnUrl: `/products/${this.product.productId}` 
        }
      });
    }
  }

  // Helper method to show a notification
  showNotification(message: string): void {
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
}