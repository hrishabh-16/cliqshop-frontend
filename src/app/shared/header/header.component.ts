import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { CategoryService } from '../../services/category/category.service';
import { CartService } from '../../services/cart/cart.service';
import { OrderService } from '../../services/order/order.service';
import { Category } from '../../models/category.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isAdmin = false;
  username = '';
  isMenuOpen = false;
  isScrolled = false;
  categories: Category[] = [];
  isProfileMenuOpen = false;
  cartItemCount = 0;
  orderCount = 0;
  private authSubscription?: Subscription;
  private cartSubscription?: Subscription;
  private orderSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private categoryService: CategoryService,
    private cartService: CartService,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.setupAuthListener();
    this.loadCategories();
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.cartSubscription?.unsubscribe();
    this.orderSubscription?.unsubscribe();
  }

  private setupAuthListener(): void {
    this.authSubscription = this.authService.getCurrentUserObservable().subscribe(() => {
      this.updateAuthStatus();
    });
    this.updateAuthStatus();
  }

  private setupScrollListener(): void {
    this.onWindowScroll(); // Initial check
    window.addEventListener('scroll', this.onWindowScroll.bind(this));
  }

  @HostListener('window:scroll')
  private onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories.slice(0, 6); // Show first 6 categories
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  private updateAuthStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();
    
    if (this.isLoggedIn) {
      const user = this.authService.getCurrentUser();
      this.username = user?.name || user?.username || '';
      this.updateCartCount();
      this.updateOrderCount();
    } else {
      this.cartItemCount = 0;
      this.orderCount = 0;
    }
  }

  private updateCartCount(): void {
    if (!this.isLoggedIn) {
      this.cartItemCount = 0;
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.warn('Cannot update cart count - userId is missing');
      this.cartItemCount = 0;
      return;
    }

    this.cartSubscription?.unsubscribe();
    this.cartSubscription = this.cartService.getCartByUserId(userId).subscribe({
      next: (cart) => {
        this.cartItemCount = cart?.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
      },
      error: (error) => {
        console.error('Error fetching cart count:', error);
        this.cartItemCount = 0;
      }
    });
  }

  private updateOrderCount(): void {
    if (!this.isLoggedIn) {
      this.orderCount = 0;
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.warn('Cannot update order count - userId is missing');
      this.orderCount = 0;
      return;
    }

    // this.orderSubscription?.unsubscribe();
    // this.orderSubscription = this.orderService.getOrdersCount(userId).subscribe({
    //   next: (count) => {
    //     this.orderCount = count;
    //   },
    //   error: (error) => {
    //     console.error('Error fetching order count:', error);
    //     this.orderCount = 0;
    //   }
    // });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  closeMenus(): void {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
  }

  login(): void {
    this.closeMenus();
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  register(): void {
    this.closeMenus();
    this.router.navigate(['/register']);
  }

  logout(): void {
    this.authService.logout();
    this.updateAuthStatus();
    this.closeMenus();
    this.router.navigate(['/home']);
  }

  goToProfile(): void {
    this.closeMenus();
    this.router.navigate([this.isAdmin ? '/admin/settings/profile' : '/user/profile']);
  }

  goToOrders(): void {
    this.closeMenus();
    // Navigate to user orders for regular users, admin orders for admins
    this.router.navigate([this.isAdmin ? '/admin/orders' : '/orders']);
  }

  goToCart(): void {
    this.closeMenus();
    this.router.navigate(['/cart']);
  }

  goToDashboard(): void {
    this.closeMenus();
    this.router.navigate(['/admin/dashboard']);
  }

  goToHome(): void {
    this.closeMenus();
    this.router.navigate(['/home']);
  }

  navigateToCategory(categoryId: number): void {
    this.closeMenus();
    this.router.navigate(['/products'], { queryParams: { category: categoryId } });
  }
}