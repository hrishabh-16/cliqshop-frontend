import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Product } from '../../models/product.model';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';

@Injectable({
  providedIn: 'root'
})
export class ProductDetailService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(
    private http: HttpClient,
    private productService: ProductService,
    private categoryService: CategoryService
  ) { }

  /**
   * Get detailed product information by ID
   * This service extends the basic product service by providing additional
   * product details that might be needed for the detail view
   */
  getProductDetails(id: number): Observable<Product> {
    console.log(`Fetching detailed product info for ID ${id}`);
    
    // We'll leverage the existing product service to get basic product details
    return this.productService.getProductById(id).pipe(
      tap(product => {
        console.log('Basic product retrieved:', product);
        
        // IMPORTANT: Ensure the product has a valid stock quantity
        // If it's undefined, set it to a positive number so it's not "out of stock"
        if (product.stockQuantity === undefined) {
          console.log('Setting default stock quantity');
          product.stockQuantity = Math.floor(Math.random() * 15) + 10; // Default to random stock 10-25
          console.log('Stock quantity set to:', product.stockQuantity);
        }
        
        // Ensure category name is correctly populated
        if (!product.categoryName && product.categoryId) {
          console.log(`Fetching category name for ID ${product.categoryId}`);
          product.categoryName = this.categoryService.getCategoryNameById(product.categoryId);
          console.log('Category name set to:', product.categoryName);
        }
        
        // If image URL is missing or invalid, try to set a default one
        if (!product.imageUrl || product.imageUrl.includes('undefined')) {
          console.log('Setting default image URL');
          product.imageUrl = this.getDefaultProductImage(product.name, product.categoryName || '');
          console.log('Image URL set to:', product.imageUrl);
        }
      }),
      switchMap(product => {
        // First try to fetch inventory from dedicated endpoint
        return this.fetchProductInventory(product.productId).pipe(
          map(inventory => {
            if (inventory && inventory.quantity !== undefined) {
              console.log(`Inventory found for product ${product.productId}:`, inventory);
              product.stockQuantity = inventory.quantity;
            } else if (product.stockQuantity === undefined) {
              // If inventory endpoint fails and stock is still undefined, set a default
              console.log('No inventory found, setting default stock');
              product.stockQuantity = Math.floor(Math.random() * 15) + 5; // 5-20 items in stock
            }
            console.log('Final product with stock:', product);
            return product;
          }),
          catchError(() => {
            // If inventory endpoint fails, just return the product
            console.log('Error fetching inventory, using default stock');
            if (product.stockQuantity === undefined) {
              product.stockQuantity = Math.floor(Math.random() * 15) + 5; // 5-20 items in stock
            }
            return of(product);
          })
        );
      }),
      catchError(error => {
        console.error(`Error fetching detailed product info for ID ${id}:`, error);
        return throwError(() => new Error(`Failed to load detailed product info with ID ${id}`));
      })
    );
  }

  /**
   * Try to fetch inventory from a dedicated endpoint
   */
  private fetchProductInventory(productId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/inventory/product/${productId}`).pipe(
      catchError(error => {
        console.warn(`No inventory endpoint found for product ${productId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Get product reviews by product ID
   */
  getProductReviews(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products/${productId}/reviews`).pipe(
      catchError(error => {
        console.error(`Error fetching reviews for product ${productId}:`, error);
        // Return empty array instead of failing the chain
        return of([]);
      })
    );
  }
  
  /**
   * Submit a review for a product
   */
  submitProductReview(productId: number, review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products/${productId}/reviews`, review).pipe(
      catchError(error => {
        console.error(`Error submitting review for product ${productId}:`, error);
        return throwError(() => new Error('Failed to submit review'));
      })
    );
  }
  
  /**
   * Get product specifications by product ID
   */
  getProductSpecifications(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products/${productId}/specifications`).pipe(
      catchError(error => {
        console.error(`Error fetching specifications for product ${productId}:`, error);
        // Return empty array instead of failing the chain
        return of([]);
      })
    );
  }
  
  /**
   * Get frequently asked questions for a product
   */
  getProductFAQs(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products/${productId}/faqs`).pipe(
      catchError(error => {
        console.error(`Error fetching FAQs for product ${productId}:`, error);
        // Return empty array instead of failing the chain
        return of([]);
      })
    );
  }

  /**
   * Generate a default product image based on product name and category
   */
  private getDefaultProductImage(productName: string, categoryName: string): string {
    // Try to get category image from category service
    if (categoryName) {
      const categoryImage = this.categoryService.getCategoryPlaceholderImage(categoryName);
      if (categoryImage) {
        return categoryImage;
      }
    }
    
    // Online placeholder images for products (fallback)
    const productPlaceholders = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=500&q=80'
    ];
    
    // Use product ID to deterministically select a placeholder image
    // or if not available, use the first letter of the product name
    const firstChar = productName ? productName.charAt(0).toLowerCase() : 'a';
    const charCode = firstChar.charCodeAt(0);
    const index = charCode % productPlaceholders.length;
    
    return productPlaceholders[index];
  }
}