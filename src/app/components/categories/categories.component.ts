import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category/category.service';

@Component({
  selector: 'app-categories',
  standalone:false,
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  isLoading: boolean = true;
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  searchQuery: string = '';
  showScrollTop: boolean = false;

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 300;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAllCategories(false).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.filteredCategories = [...categories];
        this.isLoading = false;
        console.log('Categories loaded:', categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoading = false;
      }
    });
  }

  searchCategories(): void {
    if (!this.searchQuery.trim()) {
      this.filteredCategories = [...this.categories];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredCategories = this.categories.filter(category => 
      category.name.toLowerCase().includes(query) || 
      (category.description && category.description.toLowerCase().includes(query))
    );
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.filteredCategories = [...this.categories];
  }

  navigateToProducts(categoryId: number): void {
    this.router.navigate(['/products'], { 
      queryParams: { category: categoryId } 
    });
  }

  // Helper method to get placeholder image for categories without images
  getCategoryPlaceholderImage(categoryName: string): string {
    return this.categoryService.getCategoryPlaceholderImage(categoryName);
  }
}