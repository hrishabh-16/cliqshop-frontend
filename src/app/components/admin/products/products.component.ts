
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Category } from '../../../models/category.model';
import { Product } from '../../../models/product.model';
import { ProductService } from '../../../services/product/product.service';
import { CategoryService } from '../../../services/category/category.service';
import { forkJoin, Subscription, of, timer } from 'rxjs';
import { catchError, switchMap, finalize, tap } from 'rxjs/operators';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  standalone: false,
})
export class ProductsComponent implements OnInit, OnDestroy {
  currentView: string = 'list';
  products: Product[] = [];
  selectedProduct: Product | null = null;
  categories: Category[] = [];
  loading = true;
  error: string | null = null;
  
  productForm: FormGroup;
  isSubmitting = false;

  showAddModal = false;
  showEditModal = false;
  showViewModal = false;
  showDeleteModal = false;
  
  // Pagination properties
  totalProducts = 0;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pages: number[] = [];
  
  searchQuery = '';
  categoriesLoaded = false;
  loadingTimeout: any = null;
  loadRetries = 0;
  private subscriptions = new Subscription();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      imageUrl: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      categoryId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Set a hard timeout to force the loading state to complete
    this.loadingTimeout = setTimeout(() => {
      if (this.loading) {
        console.warn('Force stopping loading after 30 seconds');
        this.loading = false;
        this.error = 'Loading timed out. Please refresh to try again.';
      }
    }, 10000); // 10 seconds absolute maximum loading time
    
    // Load categories first, then handle route parameters and load products
    const categorySubscription = this.categoryService.getAllCategories().pipe(
      catchError(error => {
        console.error('Failed to load categories:', error);
        return of([]);
      })
    ).subscribe({
      next: (categories) => {
        console.log('Categories loaded:', categories);
        this.categories = categories;
        this.categoriesLoaded = true;
        
        // Now subscribe to route params and load products
        this.subscriptions.add(
          this.route.queryParams.subscribe(params => {
            this.currentView = params['view'] || 'list';
            this.currentPage = parseInt(params['page'] || '1', 10);
            this.loadProducts();
          })
        );
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categories = [];
        this.categoriesLoaded = true; // Consider the process completed even with error
        
        // Still continue to load products
        this.subscriptions.add(
          this.route.queryParams.subscribe(params => {
            this.currentView = params['view'] || 'list';
            this.currentPage = parseInt(params['page'] || '1', 10);
            this.loadProducts();
          })
        );
      }
    });
    
    this.subscriptions.add(categorySubscription);
  }

  ngOnDestroy(): void {
    // Clear timeout if component is destroyed
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
  }

  loadProducts(): void {
    console.log('Loading products for view:', this.currentView);
    this.loading = true;
    this.error = null;
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    this.loadingTimeout = setTimeout(() => {
      if (this.loading) {
        console.warn('Loading products operation timed out');
        this.loading = false;
        this.error = 'Loading products timed out. Please try again.';
      }
    }, 15000);
    
    if (this.isListView) {
      const productSubscription = timer(0).pipe(
        switchMap(() => {
          console.log('Fetching products from API, attempt:', this.loadRetries + 1);
          return this.productService.getAllProducts(this.currentPage, this.itemsPerPage).pipe(
            tap(data => {
              console.log('Products data received:', data);
            }),
            catchError(error => {
              console.error('Error loading products:', error);
              if (this.loadRetries < 2) {
                this.loadRetries++;
                console.log('Retrying product load, attempt:', this.loadRetries + 1);
                return timer(1000).pipe(
                  switchMap(() => this.productService.getAllProducts(this.currentPage, this.itemsPerPage))
                );
              }
              throw error;
            }),
            finalize(() => {
              clearTimeout(this.loadingTimeout);
              this.loadingTimeout = null;
              this.loading = false;
              this.loadRetries = 0;
            })
          );
        })
      ).subscribe({
        next: (data) => {
          console.log('Products successfully loaded:', data);
          this.products = data.products.map((product: any) => ({
            ...product,
            // Map the nested category data to the flat structure your model expects
            categoryId: product.category?.categoryId || product.categoryId || 0,
            categoryName: product.category?.name || product.categoryName || this.getCategoryName(product.category?.categoryId || product.categoryId)
          }));
          
          this.totalProducts = data.total || data.products.length;
          this.calculateTotalPages();
          this.generatePagesArray();
        },
        error: (error) => {
          console.error('All attempts to load products failed:', error);
          this.error = 'Failed to load products. API might be unavailable.';
          this.products = [];
        }
      });
      
      this.subscriptions.add(productSubscription);
    } else if (this.isOutOfStockView) {
      const outOfStockSubscription = this.productService.getOutOfStockProducts().pipe(
        finalize(() => {
          clearTimeout(this.loadingTimeout);
          this.loadingTimeout = null;
          this.loading = false;
        })
      ).subscribe({
        next: (products) => {
          console.log('Out of stock products loaded:', products);
          this.products = products.map((product: any) => ({
            ...product,
            // Map the nested category data to the flat structure your model expects
            categoryId: product.category?.categoryId || product.categoryId || 0,
            categoryName: product.category?.name || product.categoryName || this.getCategoryName(product.category?.categoryId || product.categoryId)
          }));
          this.totalProducts = products.length;
        },
        error: (error) => {
          console.error('Error loading out of stock products:', error);
          this.error = 'Failed to load out of stock products.';
          this.products = [];
        }
      });
      
      this.subscriptions.add(outOfStockSubscription);
    } else {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
      this.loading = false;
    }
  }

  calculateTotalPages(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalProducts / this.itemsPerPage));
    console.log(`Total pages calculated: ${this.totalPages} (${this.totalProducts} products / ${this.itemsPerPage} per page)`);
  }

  generatePagesArray(): void {
    this.pages = [];
    // Show more pages for better navigation
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    // Ensure we always show at least 5 pages if available
    if (endPage - startPage + 1 < 5) {
      if (startPage === 1) {
        endPage = Math.min(5, this.totalPages);
      } else if (endPage === this.totalPages) {
        startPage = Math.max(1, this.totalPages - 4);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    
    this.router.navigate(['/admin/products'], { 
      queryParams: { 
        view: this.currentView,
        page: page 
      } 
    });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  changeView(view: string): void {
    this.router.navigate(['/admin/products'], { 
      queryParams: { 
        view,
        page: 1 // Reset to first page when changing views
      } 
    });
  }

  navigateBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  // Force refresh products list
  refreshProducts(): void {
    this.loadProducts();
  }

  // Open product detail view modal
  viewProduct(product: Product): void {
    this.loading = true;
    
    // Get complete product details including inventory information
    this.productService.getProductById(product.productId).subscribe({
      next: (detailedProduct) => {
        console.log('Detailed product loaded:', detailedProduct);
        
        // Ensure category name is present
        if (!detailedProduct.categoryName && detailedProduct.categoryId) {
          detailedProduct.categoryName = this.getCategoryName(detailedProduct.categoryId);
        }
        
        this.selectedProduct = detailedProduct;
        this.showViewModal = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        // Fallback to using the product we already have if detail fetch fails
        if (!product.categoryName && product.categoryId) {
          product.categoryName = this.getCategoryName(product.categoryId);
        }
        
        this.selectedProduct = product;
        this.showViewModal = true;
        this.loading = false;
      }
    });
  }
  
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }
  
  getStockStatusClass(quantity: number | undefined): string {
    if (!quantity || quantity <= 0) {
      return 'text-red-600';
    } else if (quantity <= 10) {
      return 'text-yellow-600';
    } else {
      return 'text-green-600';
    }
  }
  
  getStockStatusText(quantity: number | undefined): string {
    if (!quantity || quantity <= 0) {
      return 'Out of Stock';
    } else if (quantity <= 10) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }

  // Open edit product modal
  editProduct(product: Product): void {
    // Ensure category name is present
    if (!product.categoryName && product.categoryId) {
      product.categoryName = this.getCategoryName(product.categoryId);
    }
    
    this.selectedProduct = product;
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      price: product.price,
      categoryId: product.categoryId
    });
    this.showEditModal = true;
  }

  // Open delete confirmation modal
  confirmDelete(product: Product): void {
    // Ensure category name is present
    if (!product.categoryName && product.categoryId) {
      product.categoryName = this.getCategoryName(product.categoryId);
    }
    
    this.selectedProduct = product;
    this.showDeleteModal = true;
  }

  // Delete a product
  deleteProduct(): void {
    if (!this.selectedProduct) return;
    
    this.isSubmitting = true;
    this.productService.deleteProduct(this.selectedProduct.productId).subscribe({
      next: () => {
        // Remove the deleted product from the current list
        this.products = this.products.filter(p => p.productId !== this.selectedProduct?.productId);
        this.showDeleteModal = false;
        this.isSubmitting = false;
        this.selectedProduct = null;
        
        // Update the total count
        this.totalProducts--;
        this.calculateTotalPages();
        
        // Reload the data if the page is now empty (except for the first page)
        if (this.products.length === 0 && this.currentPage > 1) {
          this.goToPage(this.currentPage - 1);
        } else {
          // Regenerate pages array
          this.generatePagesArray();
        }
      },
      error: (error) => {
        console.error('Error deleting product:', error);
        this.isSubmitting = false;
      }
    });
  }

  // Create a new product
  addProduct(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    this.isSubmitting = true;
    const productData = this.productForm.value;
    
    this.productService.createProduct(productData).subscribe({
      next: (newProduct) => {
        this.resetForm();
        this.isSubmitting = false;
        this.showAddModal = false;
        
        // Update the total count
        this.totalProducts++;
        this.calculateTotalPages();
        this.generatePagesArray();
        
        this.changeView('list'); // Navigate back to list view
      },
      error: (error) => {
        console.error('Error creating product:', error);
        this.isSubmitting = false;
      }
    });
  }

  // Update an existing product
  updateProduct(): void {
    if (this.productForm.invalid || !this.selectedProduct) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    this.isSubmitting = true;
    const productData = this.productForm.value;
    
    this.productService.updateProduct(this.selectedProduct.productId, productData).subscribe({
      next: (updatedProduct) => {
        // Make sure updatedProduct has category name
        if (!updatedProduct.categoryName && updatedProduct.categoryId) {
          updatedProduct.categoryName = this.getCategoryName(updatedProduct.categoryId);
        }
        
        // Update the product in the current list
        const index = this.products.findIndex(p => p.productId === this.selectedProduct?.productId);
        if (index !== -1) {
          this.products[index] = updatedProduct;
        }
        
        this.resetForm();
        this.isSubmitting = false;
        this.showEditModal = false;
        this.selectedProduct = null;
      },
      error: (error) => {
        console.error('Error updating product:', error);
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

  // Reset form and selected product
  resetForm(): void {
    this.productForm.reset();
    this.selectedProduct = null;
  }

  // Open add product form
  openAddForm(): void {
    this.resetForm();
    this.changeView('add');
  }

  // Close any modal
  closeModal(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showViewModal = false;
    this.showDeleteModal = false;
    this.selectedProduct = null;
    this.resetForm();
  }

  // Helper method to find category name by ID - Improved for reliability
  getCategoryName(categoryId: number): string {
    // Early return for invalid categoryId
    if (!categoryId || isNaN(categoryId)) {
        return 'Unknown';
    }

    // First try to find in the current product's category data
    const currentProduct = this.products.find(p => 
        p.categoryId === categoryId
    );
    
    if (currentProduct?.categoryName) {
        return currentProduct.categoryName;
    }

    // Try to get from category service (which might have cached data)
    try {
        const categoryName = this.categoryService.getCategoryNameById(categoryId);
        if (categoryName && categoryName !== 'Unknown') {
            return categoryName;
        }
    } catch (error) {
        console.warn('Error getting category name from service:', error);
    }

    // Check local categories array (fallback)
    if (this.categories?.length) {
        const category = this.categories.find(c => 
            c?.categoryId === categoryId || c?.id === categoryId
        );
        if (category?.name) {
            return category.name;
        }
    }

    // Final fallback
    return 'Unknown';
}

  // Format price with currency
  formatPrice(price: number): string {
    return this.productService.formatPrice(price);
  }

  get isListView(): boolean {
    return this.currentView === 'list';
  }

  get isAddView(): boolean {
    return this.currentView === 'add';
  }

  get isOutOfStockView(): boolean {
    return this.currentView === 'outOfStock';
  }
}