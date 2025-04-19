import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { CategoryService } from '../../services/category/category.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  username = '';
  isMenuOpen = false;
  isScrolled = false;
  categories: Category[] = [];
  isProfileMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    this.updateAuthStatus();
    this.loadCategories();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories.slice(0, 6); // Show first 6 categories
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  updateAuthStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();
    
    if (this.isLoggedIn) {
      const user = this.authService.getCurrentUser();
      this.username = user ? user.name || user.username : '';
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeMenus(): void {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
  }

  login(): void {
    this.closeMenus();
    this.router.navigate(['/login']);
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
    if (this.isAdmin) {
      this.router.navigate(['/admin/settings/profile']);
    } else {
      this.router.navigate(['/profile']);
    }
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
    this.router.navigate(['/home']);
  }
}