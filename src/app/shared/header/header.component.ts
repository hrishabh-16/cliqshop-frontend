import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { CategoryService } from '../../services/category/category.service';
import { CartService } from '../../services/cart/cart.service';
import { Category } from '../../models/category.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone:false,
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
  private authSubscription?: Subscription;
  private cartSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private categoryService: CategoryService,
    private cartService: CartService
  ) { }

  ngOnInit(): void {
    this.setupAuthListener();
    this.loadCategories();
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.cartSubscription?.unsubscribe();
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
    } else {
      this.cartItemCount = 0;
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
    this.router.navigate([this.isAdmin ? '/admin/settings/profile' : '/profile']);
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