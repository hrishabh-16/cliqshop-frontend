// cliqshop-frontend\src\app\services\product\product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { map, switchMap, catchError, tap, retry, timeout } from 'rxjs/operators';
import { CategoryService } from '../category/category.service';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';

export interface ProductRequest {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  categoryId: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:9000/api';
  private categories: Category[] = [];
  private apiConnected = false;

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService
  ) {
    console.log('ProductService initialized with API URL:', this.apiUrl);
    
    // Pre-load categories when service is initialized
    this.loadCategories();
    
    // Test the API connection
    this.testApiConnection();
  }

  // Test API connection with multiple endpoints
  private testApiConnection(): void {
    // Try multiple endpoints to establish connection
    const endpoints = [
      `${this.apiUrl}/products`,
      `${this.apiUrl}/admin/products`,
      `${this.apiUrl}/categories`
    ];

    // Try each endpoint in order
    let currentEndpointIndex = 0;

    const tryEndpoint = (index: number) => {
      if (index >= endpoints.length) {
        console.error('All API endpoints failed');
        return;
      }

      console.log(`Testing API connection to: ${endpoints[index]}`);
      this.http.get(endpoints[index])
        .pipe(
          timeout(5000), // 5 second timeout
          catchError(error => {
            console.warn(`Endpoint ${endpoints[index]} failed:`, error);
            tryEndpoint(index + 1);
            return of(null);
          })
        )
        .subscribe({
          next: (response) => {
            if (response !== null) {
              console.log('API connection established with:', endpoints[index]);
              this.apiConnected = true;
            }
          }
        });
    };

    tryEndpoint(0);
  }

  // Load all categories and store them for later use
  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('ProductService loaded categories:', categories);
      },
      error: (error) => {
        console.error('Error loading categories in ProductService:', error);
      }
    });
  }

  // Get all products with pagination
  getAllProducts(page: number = 1, limit: number = 10): Observable<ProductsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    // Ensure categories are loaded first
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.get<any>(`${this.apiUrl}/products`, { params })
        .pipe(
          retry(1), // Retry once on failure
          timeout(10000), // 10 second timeout
          catchError(error => {
            console.warn('First endpoint failed, trying admin endpoint...');
            // Try admin endpoint as fallback
            return this.http.get<any>(`${this.apiUrl}/admin/products`, { params })
              .pipe(
                retry(1),
                timeout(10000),
                catchError(secondError => {
                  console.error('Both product endpoints failed:', secondError);
                  return of({ content: [] }); // Return empty result
                })
              );
          })
        )
      ),
      map(response => {
        console.log('Raw response from API:', response);
        
        // Handle different API response formats
        let products: Product[] = [];
        
        if (Array.isArray(response)) {
          // If response is an array, use it directly
          products = response;
        } else if (response && response.content && Array.isArray(response.content)) {
          // Spring pagination format
          products = response.content;
        } else if (response && response.products && Array.isArray(response.products)) {
          // Custom format with products array
          products = response.products;
        } else if (response && typeof response === 'object') {
          // If it's an object but not in expected format, try to extract products
          const possibleProducts = Object.values(response).find(val => Array.isArray(val));
          products = Array.isArray(possibleProducts) ? possibleProducts : [];
        }
        
        console.log('Extracted products:', products);
        const enrichedProducts = this.enrichProductsWithCategoryNames(products);
        console.log('Enriched products with categories:', enrichedProducts);
        
        return {
          products: enrichedProducts,
          total: response.totalElements || response.total || products.length,
          page,
          limit
        };
      }),
      catchError(error => {
        console.error('Error in product processing pipeline:', error);
        return of({
          products: [],
          total: 0,
          page,
          limit
        });
      })
    );
  }

  // Ensure categories are loaded before proceeding
  private ensureCategoriesLoaded(): Observable<Category[]> {
    if (this.categories.length > 0) {
      return of(this.categories);
    }
    
    return this.categoryService.getAllCategories().pipe(
      tap(categories => {
        this.categories = categories;
        console.log('Categories loaded in ensureCategoriesLoaded:', categories);
      }),
      catchError(error => {
        console.error('Failed to load categories:', error);
        // Return empty array but don't fail the chain
        return of([]);
      })
    );
  }

  // Add category names to products
  private enrichProductsWithCategoryNames(products: Product[]): Product[] {
    if (!Array.isArray(products)) {
      console.warn('Products is not an array:', products);
      return [];
    }
    
    return products.map(product => {
      // Ensure product is a valid object
      if (!product || typeof product !== 'object') {
        console.warn('Invalid product object:', product);
        return null;
      }
      
      const categoryId = product.categoryId;
      
      // Find matching category by checking both id and categoryId
      const category = this.categories.find(c => 
        c && (c.categoryId === categoryId || c.id === categoryId)
      );
      
      // Get stock quantity from inventory if it's not already present
      // Note: In a real implementation, you would fetch this from your inventory service
      const enrichedProduct = {
        ...product,
        categoryName: category ? category.name : 'Unknown'
      };
      
      // If stockQuantity isn't already on the product, try to fetch it
      if (enrichedProduct.stockQuantity === undefined) {
        // Try to fetch inventory details
        this.fetchProductInventory(enrichedProduct.productId).subscribe({
          next: (inventory) => {
            if (inventory) {
              enrichedProduct.stockQuantity = inventory.quantity || 0;
            } else {
              enrichedProduct.stockQuantity = 0;
            }
          },
          error: (error) => {
            console.error(`Failed to fetch inventory for product ${enrichedProduct.productId}:`, error);
            enrichedProduct.stockQuantity = 0;
          }
        });
      }
      
      return enrichedProduct;
    }).filter(p => p !== null) as Product[];
  }
  private fetchProductInventory(productId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/inventory/product/${productId}`)
      .pipe(
        catchError(error => {
          console.warn(`No inventory found for product ${productId}:`, error);
          return of(null);
        })
      );
  }

  getProductById(id: number): Observable<Product> {
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.get<Product>(`${this.apiUrl}/products/${id}`)
        .pipe(
          catchError(error => {
            console.warn('First endpoint failed, trying admin endpoint...');
            return this.http.get<Product>(`${this.apiUrl}/admin/products/${id}`);
          })
        )
      ),
      switchMap(product => {
        // Enhance product with category info
        const categoryId = product.categoryId;
        const category = this.categories.find(c => 
          c.categoryId === categoryId || c.id === categoryId
        );
        
        const enrichedProduct = {
          ...product,
          categoryName: category ? category.name : 'Unknown'
        };
        
        // Check if we need to fetch inventory details
        if (enrichedProduct.stockQuantity === undefined) {
          return this.fetchProductInventory(enrichedProduct.productId).pipe(
            map(inventory => {
              if (inventory) {
                enrichedProduct.stockQuantity = inventory.quantity || 0;
              } else {
                enrichedProduct.stockQuantity = 0;
              }
              return enrichedProduct;
            }),
            catchError(() => of(enrichedProduct)) // Return product even if inventory fetch fails
          );
        }
        
        return of(enrichedProduct);
      }),
      catchError(error => {
        console.error(`Error fetching product ${id}:`, error);
        return throwError(() => new Error(`Failed to load product with ID ${id}`));
      })
    );
  }

  // Create a new product
  createProduct(product: ProductRequest): Observable<Product> {
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.post<Product>(`${this.apiUrl}/admin/products`, product)),
      map(newProduct => {
        const categoryId = newProduct.categoryId;
        const category = this.categories.find(c => 
          c.categoryId === categoryId || c.id === categoryId
        );
        
        return {
          ...newProduct,
          categoryName: category ? category.name : 'Unknown'
        };
      })
    );
  }

  // Update an existing product
  updateProduct(id: number, product: ProductRequest): Observable<Product> {
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.put<Product>(`${this.apiUrl}/admin/products/${id}`, product)),
      map(updatedProduct => {
        const categoryId = updatedProduct.categoryId;
        const category = this.categories.find(c => 
          c.categoryId === categoryId || c.id === categoryId
        );
        
        return {
          ...updatedProduct,
          categoryName: category ? category.name : 'Unknown'
        };
      })
    );
  }

  // Delete a product
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/products/${id}`);
  }

  // Get products by category
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.get<Product[]>(`${this.apiUrl}/products/category/${categoryId}`)),
      map(products => this.enrichProductsWithCategoryNames(products))
    );
  }

  // Search products by name
  searchProducts(query: string): Observable<Product[]> {
    return this.ensureCategoriesLoaded().pipe(
      switchMap(() => this.http.get<Product[]>(`${this.apiUrl}/products/search?name=${query}`)),
      map(products => this.enrichProductsWithCategoryNames(products))
    );
  }

  // Get out of stock products
  getOutOfStockProducts(): Observable<Product[]> {
    // This would typically call a specific endpoint for out of stock products
    // For now, we'll simulate by filtering all products
    return this.getAllProducts(1, 100).pipe(
      map(response => {
        // Real implementation would use proper endpoint
        // For now, return whatever products were found (if any)
        return response.products.length > 0 ? response.products.slice(0, 5) : [];
      })
    );
  }

  // Get categories for dropdown
  getCategories(): Observable<Category[]> {
    return this.ensureCategoriesLoaded();
  }

  // Format price to currency
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price);
  }

  // Helper method to find category name by ID
  getCategoryName(categoryId: number): string {
    if (!categoryId) return 'Unknown';
    
    const category = this.categories.find(c => 
      c.categoryId === categoryId || c.id === categoryId
    );
    
    return category ? category.name : 'Unknown';
  }
}