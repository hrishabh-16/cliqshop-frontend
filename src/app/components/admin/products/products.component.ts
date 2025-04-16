import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../../models/product.model';
import { Category } from '../../../models/category.model';
import { ProductService } from '../../../services/product/product.service';
import { CategoryService } from '../../../services/category/category.service';
import { InventoryService } from '../../../services/inventory/inventory.service';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  selectedFilter: string = 'all';
  showModal: boolean = false;
  isEditing: boolean = false;
  productForm: FormGroup;
  
  // Pagination variables
  currentPage: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      productId: [null],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      categoryId: ['', [Validators.required]],
      imageUrl: [''],
      stockQuantity: [0, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(
      (products: Product[]) => {
        this.products = products;
        this.totalItems = products.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        // Fetch inventory data for each product
        this.products.forEach(product => {
          this.inventoryService.getInventoryByProductId(product.productId).subscribe(
            inventory => {
              product.stockQuantity = inventory?.quantity || 0;
            }
          );
        });
      },
      error => {
        console.error('Error loading products:', error);
      }
    );
  }
  selectAllProducts(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.products.forEach(product => {
      product.selected = isChecked;
    });
  }
  

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe(
      (categories: Category[]) => {
        this.categories = categories;
      },
      error => {
        console.error('Error loading categories:', error);
      }
    );
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  applyFilter(): void {
    // Implement filtering logic based on selectedFilter
    // You might need to modify your backend API to support filtering
    this.loadProducts();
  }

  openAddProductModal(): void {
    this.isEditing = false;
    this.productForm.reset({
      price: 0,
      stockQuantity: 0
    });
    this.showModal = true;
  }

  editProduct(productId: number): void {
    this.productService.getProductById(productId).subscribe(
      (product: Product) => {
        this.isEditing = true;
        this.productForm.patchValue({
          productId: product.productId,
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl
        });
        
        // Get stock quantity from inventory
        this.inventoryService.getInventoryByProductId(productId).subscribe(
          inventory => {
            this.productForm.patchValue({
              stockQuantity: inventory?.quantity || 0
            });
            this.showModal = true;
          }
        );
      },
      error => {
        console.error('Error loading product:', error);
      }
    );
  }

  deleteProduct(productId: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(productId).subscribe(
        () => {
          this.loadProducts();
        },
        error => {
          console.error('Error deleting product:', error);
        }
      );
    }
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    const productData = this.productForm.value;
    
    if (this.isEditing) {
      this.productService.updateProduct(productData.productId, productData).subscribe(
        (updatedProduct: Product) => {
          // Update inventory
          this.inventoryService.updateStock(updatedProduct.productId, productData.stockQuantity).subscribe(
            () => {
              this.closeModal();
              this.loadProducts();
            }
          );
        },
        error => {
          console.error('Error updating product:', error);
        }
      );
    } else {
      this.productService.createProduct(productData).subscribe(
        (newProduct: Product) => {
          // Create inventory record
          const inventoryData = {
            productId: newProduct.productId,
            quantity: productData.stockQuantity,
            lowStockThreshold: 10
          };
          
          this.inventoryService.createInventory(inventoryData).subscribe(
            () => {
              this.closeModal();
              this.loadProducts();
            }
          );
        },
        error => {
          console.error('Error creating product:', error);
        }
      );
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.productForm.reset();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;

    if (this.totalPages <= maxPages) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(0, this.currentPage - Math.floor(maxPages / 2));
      let endPage = Math.min(this.totalPages - 1, startPage + maxPages - 1);

      if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - maxPages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}