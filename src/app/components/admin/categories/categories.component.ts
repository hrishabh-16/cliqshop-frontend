import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { CategoryService } from '../../../services/category/category.service';
import { ProductService } from '../../../services/product/product.service';
import { InventoryService } from '../../../services/inventory/inventory.service';
import { Category } from '../../../models/category.model';
import { Product } from '../../../models/product.model';

interface CategoryWithStats {
  category: Category;
  products: number;
  minPrice: number | null;
  totalStock: number;
}

@Component({
  selector: 'app-categories',
  standalone: false,
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  categories: CategoryWithStats[] = [];
  selectedCategory: Category | null = null;
  loading = true;
  error: string | null = null;
  
  showAddForm = false;
  showEditModal = false;
  showDeleteModal = false;
  showViewModal = false;
  isSubmitting = false;
  
  categoryForm: FormGroup;
  
  // View details
  viewingCategory: CategoryWithStats | null = null;
  categoryProducts: Product[] = [];
  loadingDetails = false;

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private inventoryService: InventoryService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if the view query parameter is 'add'
    this.route.queryParams.subscribe(params => {
      if (params['view'] === 'add') {
        this.showAddForm = true;
      }
    });
    
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.error = null;
    
    this.categoryService.getAllCategories(false).subscribe({
      next: (categories) => {
        console.log('Categories loaded:', categories);
        // For each category, get statistics (product count, min price, total stock)
        const observables = categories.map(category => this.getCategoryStats(category));
        
        forkJoin(observables).subscribe({
          next: (categoriesWithStats) => {
            this.categories = categoriesWithStats;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading category statistics:', error);
            // Fall back to just displaying categories without stats
            this.categories = categories.map(category => ({
              category,
              products: 0,
              minPrice: null,
              totalStock: 0
            }));
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.error = 'Failed to load categories. Please try again.';
        this.loading = false;
      }
    });
  }

  // Get statistics for a category
  getCategoryStats(category: Category): Observable<CategoryWithStats> {
    // First get products by category
    return this.productService.getProductsByCategory(category.categoryId).pipe(
      switchMap(products => {
        // Initialize stats
        let minPrice: number | null = null;
        let totalProducts = products.length;
        
        if (products.length > 0) {
          const prices = products.map(p => p.price).filter(price => price > 0);
          minPrice = prices.length > 0 ? Math.min(...prices) : null;
        }
        
        // Now get inventory data for all products in this category
        const productIds = products.map(p => p.productId);
        
        if (productIds.length === 0) {
          // No products in this category
          return of({
            category,
            products: 0,
            minPrice: null,
            totalStock: 0
          });
        }
        
        // Get inventory data for all products in this category
        return this.inventoryService.getAllInventory().pipe(
          map(allInventory => {
            // Filter to only include inventory items for products in this category
            const categoryInventory = allInventory.filter(item => 
              item.product && productIds.includes(item.product.productId)
            );
            
            // Calculate total stock
            const totalStock = categoryInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            return {
              category,
              products: totalProducts,
              minPrice,
              totalStock
            };
          }),
          catchError(error => {
            console.error(`Error getting inventory for category ${category.name}:`, error);
            return of({
              category,
              products: totalProducts,
              minPrice,
              totalStock: 0 // Fallback to 0 if inventory fetch fails
            });
          })
        );
      }),
      catchError(error => {
        console.error(`Error getting stats for category ${category.name}:`, error);
        return of({
          category,
          products: 0,
          minPrice: null,
          totalStock: 0
        });
      })
    );
  }

  // View category details
  viewCategory(categoryWithStats: CategoryWithStats): void {
    this.viewingCategory = categoryWithStats;
    this.loadingDetails = true;
    this.showViewModal = true;
    
    // Load products for this category
    this.productService.getProductsByCategory(categoryWithStats.category.categoryId).subscribe({
      next: (products) => {
        this.categoryProducts = products;
        this.loadingDetails = false;
      },
      error: (error) => {
        console.error('Error loading category products:', error);
        this.categoryProducts = [];
        this.loadingDetails = false;
      }
    });
  }

  // Refresh categories list
  refreshCategories(): void {
    this.categoryService.clearCache();
    this.loadCategories();
  }

  // Toggle add form visibility
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      // Update URL to reflect that we're in add mode
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: 'add' },
        queryParamsHandling: 'merge'
      });
      this.resetForm();
    } else {
      // Remove view param when closing the form
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  // Reset form
  resetForm(): void {
    this.categoryForm.reset();
    this.selectedCategory = null;
  }

  // Open edit modal for a category
  editCategory(categoryWithStats: CategoryWithStats): void {
    this.selectedCategory = categoryWithStats.category;
    this.categoryForm.patchValue({
      name: categoryWithStats.category.name,
      description: categoryWithStats.category.description
    });
    this.showEditModal = true;
  }

  // Open delete confirmation modal
  confirmDelete(categoryWithStats: CategoryWithStats): void {
    this.selectedCategory = categoryWithStats.category;
    this.showDeleteModal = true;
  }

  // Close any modal
  closeModal(): void {
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showViewModal = false;
    this.viewingCategory = null;
    this.categoryProducts = [];
    this.resetForm();
  }

  // Create a new category
  addCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    this.isSubmitting = true;
    const categoryData = this.categoryForm.value;
    
    this.categoryService.createCategory(categoryData).subscribe({
      next: (newCategory) => {
        console.log('Category created successfully:', newCategory);
        // Add to list with empty stats
        this.categories.push({
          category: newCategory,
          products: 0,
          minPrice: null,
          totalStock: 0
        });
        this.resetForm();
        this.isSubmitting = false;
        this.showAddForm = false;
        
        // Update URL to remove 'add' view after success
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { view: null },
          queryParamsHandling: 'merge'
        });
        
        this.refreshCategories(); // Refresh to get updated list with stats
      },
      error: (error) => {
        console.error('Error creating category:', error);
        this.error = error.error || 'Failed to create category. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  // Update an existing category
  updateCategory(): void {
    if (this.categoryForm.invalid || !this.selectedCategory) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    this.isSubmitting = true;
    const categoryData = this.categoryForm.value;
    
    this.categoryService.updateCategory(this.selectedCategory.categoryId, categoryData).subscribe({
      next: (updatedCategory) => {
        // Update the category in the current list
        const index = this.categories.findIndex(c => c.category.categoryId === this.selectedCategory?.categoryId);
        if (index !== -1) {
          this.categories[index].category = updatedCategory;
        }
        this.resetForm();
        this.isSubmitting = false;
        this.showEditModal = false;
        this.refreshCategories(); // Refresh to get updated list
      },
      error: (error) => {
        console.error('Error updating category:', error);
        this.error = error.error || 'Failed to update category. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  // Delete a category
  deleteCategory(): void {
    if (!this.selectedCategory) return;
    
    this.isSubmitting = true;
    
    this.categoryService.deleteCategory(this.selectedCategory.categoryId).subscribe({
      next: () => {
        // Remove the deleted category from the current list
        this.categories = this.categories.filter(c => c.category.categoryId !== this.selectedCategory?.categoryId);
        this.showDeleteModal = false;
        this.isSubmitting = false;
        this.selectedCategory = null;
      },
      error: (error) => {
        console.error('Error deleting category:', error);
        this.error = error.error || 'Failed to delete category. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  // Helper method to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Navigate back to dashboard
  navigateBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  // Format price with currency
  formatPrice(price: number | null): string {
    if (price === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price);
  }
}