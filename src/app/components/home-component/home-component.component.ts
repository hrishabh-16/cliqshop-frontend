import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { HomeService } from '../../services/home/home.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-home-component',
  standalone: false,
  templateUrl: './home-component.component.html',
  styleUrls: ['./home-component.component.css']
})
export class HomeComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  
  
  featuredProducts: Product[] = [];
  latestProducts: Product[] = [];
  categories: Category[] = [];
  isLoading: boolean = true;
  searchQuery: string = '';
  currentSlide: number = 0;
  showScrollTop: boolean = false;
  showSearchBar: boolean = false;
  isChatOpen: boolean = false;
  
  banners: any[] = [
    {
      title: 'Discover New Collection',
      subtitle: 'Explore our latest styles and trends for the new season. Find your perfect look today.',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZmFzaGlvbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=1200&q=60',
      buttonText: 'Shop Now',
      link: '/products'
    },
    {
      title: 'Summer Sale',
      subtitle: 'Get up to 50% off on summer styles. Limited time offer.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGZhc2hpb258ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=1200&q=60',
      buttonText: 'Shop Now',
      link: '/products'
    },
    {
      title: 'New Arrivals',
      subtitle: 'Checkout our newly arrived products and accessories.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGZhc2hpb258ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=1200&q=60',
      buttonText: 'Shop Now',
      link: '/products'
    }
  ];
  
  constructor(
    private homeService: HomeService,
    private cartService: CartService,
    private authService: AuthService,
    public router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadHomePageData();
    
    // Auto slideshow
    setInterval(() => {
      this.nextSlide();
    }, 6000);
  }
  
  ngAfterViewChecked() {
    this.scrollChatToBottom();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollTop = scrollPosition > 400;
  }

  loadHomePageData(): void {
    this.isLoading = true;
    
    console.log('Loading home page data...');
    
    this.homeService.getHomePageData()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          console.log('Home page data received:', data);
          
          // Check if we received valid data
          if (data) {
            this.featuredProducts = data.featuredProducts || [];
            this.categories = data.categories || [];
            this.latestProducts = data.latestProducts || [];
            
            console.log('Assigned featured products:', this.featuredProducts.length);
            console.log('Assigned categories:', this.categories.length);
            console.log('Assigned latest products:', this.latestProducts.length);
            
            // Fallback for featured products if they're empty
            this.checkAndLoadProducts();
          } else {
            console.error('Received null or undefined data from API');
            this.loadFallbackData();
          }
        },
        error: (error) => {
          console.error('Error loading home page data:', error);
          this.loadFallbackData();
        }
      });
  }

  getCategoryName(productCategoryId: number): string {
    const category = this.categories.find(c => c.categoryId === productCategoryId);
    return category?.name || 'General';
  }
  
  // Check and load products if needed
  checkAndLoadProducts(): void {
    // Check featured products
    if (!this.featuredProducts || this.featuredProducts.length === 0) {
      console.log('No featured products loaded, fetching directly...');
      this.homeService.getFeaturedProducts().subscribe({
        next: (products) => {
          console.log('Featured products loaded directly:', products.length);
          this.featuredProducts = products;
          
          // If still empty, use mock data
          if (this.featuredProducts.length === 0) {
            console.log('Using mock featured products as fallback');
            this.featuredProducts = this.homeService.getMockProducts(8);
          }
        }
      });
    }
    
    // Check latest products
    if (!this.latestProducts || this.latestProducts.length === 0) {
      console.log('No latest products loaded, fetching directly...');
      this.homeService.getRecentProducts().subscribe({
        next: (products) => {
          console.log('Latest products loaded directly:', products.length);
          this.latestProducts = products;
          
          // If still empty, use mock data
          if (this.latestProducts.length === 0) {
            console.log('Using mock latest products as fallback');
            this.latestProducts = this.homeService.getMockProducts(4);
          }
        }
      });
    }
  }
  
  // Load fallback data if the main API call fails
  loadFallbackData(): void {
    console.log('Loading fallback data...');
    
    // Try to load categories
    this.homeService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        
        // If categories is empty, use mock data
        if (this.categories.length === 0) {
          console.log('Using mock categories as fallback');
          this.categories = this.homeService.getMockCategories();
        }
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.categories = this.homeService.getMockCategories();
      }
    });
    
    // Load products directly
    this.homeService.getFeaturedProducts().subscribe({
      next: (products) => {
        this.featuredProducts = products;
        
        // If featured products is empty, use mock data
        if (this.featuredProducts.length === 0) {
          console.log('Using mock products as fallback');
          this.featuredProducts = this.homeService.getMockProducts(8);
        }
      },
      error: (error) => {
        console.error('Failed to load featured products:', error);
        this.featuredProducts = this.homeService.getMockProducts(8);
      }
    });
    
    // Load latest products
    this.homeService.getRecentProducts().subscribe({
      next: (products) => {
        this.latestProducts = products;
        
        // If latest products is empty, use mock data
        if (this.latestProducts.length === 0) {
          console.log('Using mock latest products as fallback');
          this.latestProducts = this.homeService.getMockProducts(4);
        }
      },
      error: (error) => {
        console.error('Failed to load latest products:', error);
        this.latestProducts = this.homeService.getMockProducts(4);
      }
    });
  }

  getCategoryColor(category: any): string {
    // Create a consistent color based on category name
    const colors = [
      'bg-gradient-to-r from-pink-500 to-rose-500',
      'bg-gradient-to-r from-amber-500 to-yellow-500',
      'bg-gradient-to-r from-green-500 to-emerald-500',
      'bg-gradient-to-r from-blue-500 to-indigo-500',
      'bg-gradient-to-r from-purple-500 to-violet-500',
      'bg-gradient-to-r from-cyan-500 to-sky-500',
      'bg-gradient-to-r from-red-500 to-orange-500'
    ];
    
    // Get a consistent index based on category name
    const index = Math.abs(this.hashCode(category.name)) % colors.length;
    return colors[index];
  }
  

  getCategoryGradient(category: any): string {
    // Create consistent gradients based on category name
    const gradients = [
      'bg-gradient-to-br from-indigo-500 to-purple-600',
      'bg-gradient-to-br from-rose-500 to-pink-600',
      'bg-gradient-to-br from-emerald-500 to-teal-600',
      'bg-gradient-to-br from-amber-500 to-orange-600',
      'bg-gradient-to-br from-blue-500 to-cyan-600',
      'bg-gradient-to-br from-violet-500 to-fuchsia-600',
      'bg-gradient-to-br from-lime-500 to-green-600'
    ];
    
    const index = Math.abs(this.hashCode(category.name)) % gradients.length;
    return gradients[index];
  }
  
  getCategoryIcon(categoryName: string): string {
    // Map category names to specific icons
    const name = categoryName.toLowerCase();
    if (name.includes('electron') || name.includes('tech')) return 'electronics';
    if (name.includes('cloth') || name.includes('fashion')) return 'clothing';
    if (name.includes('home') || name.includes('furniture')) return 'home';
    return 'default';
  }
  
  // Simple hash function for consistent colors
  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  searchProducts(): void {
    if (this.searchQuery.trim()) {
      this.isLoading = true;
      this.homeService.searchProducts(this.searchQuery).subscribe({
        next: (data) => {
          this.featuredProducts = data;
          
          // If search returns no results, use mock data
          if (this.featuredProducts.length === 0) {
            console.log('No search results, showing mock products');
            this.featuredProducts = this.homeService.getMockProducts(4);
          }
          
          this.isLoading = false;
          this.showSearchBar = false; // Hide search bar after search
        },
        error: (error) => {
          console.error('Error searching products:', error);
          this.featuredProducts = this.homeService.getMockProducts(4);
          this.isLoading = false;
        }
      });
    } else {
      this.loadHomePageData();
    }
  }
  
  quickSearch(query: string): void {
    this.searchQuery = query;
    this.searchProducts();
  }

  addToCart(product: Product): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      // Check if CartService has the addToCart method
      if (this.cartService.addToCart && typeof this.cartService.addToCart === 'function') {
        this.cartService.addToCart(user.userId, product.productId, 1).subscribe({
          next: (response) => {
            console.log('Product added to cart:', response);
            // Show a success notification
            this.showNotification(`${product.name} added to cart!`);
          },
          error: (error) => {
            console.error('Error adding product to cart:', error);
          }
        });
      } else {
        // Fallback - direct API call
        this.http.post(`http://localhost:9000/api/cart/${user.userId}/add?productId=${product.productId}&quantity=1`, {})
          .subscribe({
            next: (response) => {
              console.log('Product added to cart:', response);
              this.showNotification(`${product.name} added to cart!`);
            },
            error: (error) => {
              console.error('Error adding product to cart:', error);
            }
          });
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  // New method to navigate to products page
  navigateToProducts(): void {
    this.router.navigate(['/products']);
  }

  // Updated method for category navigation
  navigateToCategory(categoryId: number): void {
    this.router.navigate(['/products'], { 
      queryParams: { category: categoryId } 
    });
  }

  // Old method kept for backward compatibility
  getProductsByCategory(categoryId: number): void {
    // Now just redirect to the products page with category filter
    this.navigateToCategory(categoryId);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.banners.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.banners.length) % this.banners.length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }
  
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
  
  trackById(index: number, item: any): number {
    return item.productId || item.categoryId || index;
  }
  
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  toggleSearchBar(): void {
    this.showSearchBar = !this.showSearchBar;
    if (this.showSearchBar) {
      // Reset search query when opening
      this.searchQuery = '';
    }
  }
  
  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }
  
  scrollChatToBottom(): void {
    if (this.chatMessagesContainer) {
      this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
    }
  }
  
  // A simple notification system
  showNotification(message: string): void {
    // This is a placeholder - in a real app, you'd integrate a proper notification system
    // For this demo, you would use a toast notification library
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
}