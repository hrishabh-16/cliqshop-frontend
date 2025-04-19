import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(private http: HttpClient) { }

  // Get featured products
  getFeaturedProducts(count: number = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      tap(products => console.log('Featured products fetched:', products)),
      catchError(error => {
        console.error('Error fetching featured products:', error);
        // Return an empty array instead of failing
        return of([]);
      })
    );
  }

  // Get recent products
  getRecentProducts(count: number = 4): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products?count=${count}`).pipe(
      tap(products => console.log('Recent products fetched:', products)),
      catchError(error => {
        console.error('Error fetching recent products:', error);
        return of([]);
      })
    );
  }

  // Get all categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      tap(categories => console.log('Categories fetched:', categories)),
      catchError(error => {
        console.error('Error fetching categories:', error);
        return of([]);
      })
    );
  }

  // Get products by category
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products/category/${categoryId}`).pipe(
      tap(products => console.log(`Products by category ${categoryId} fetched:`, products)),
      catchError(error => {
        console.error(`Error fetching products for category ${categoryId}:`, error);
        return of([]);
      })
    );
  }

  // Search products by name
  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products/search?name=${query}`).pipe(
      tap(products => console.log(`Search results for "${query}":`, products)),
      catchError(error => {
        console.error(`Error searching products for "${query}":`, error);
        return of([]);
      })
    );
  }

  // Get all homepage data in one request
  getHomePageData(): Observable<{ featuredProducts: Product[], categories: Category[], latestProducts: Product[] }> {
    // Try first to get data from a dedicated endpoint if it exists
    return this.http.get<{ featuredProducts: Product[], categories: Category[], latestProducts: Product[] }>(`${this.apiUrl}/home`).pipe(
      tap(data => console.log('Home page data fetched from /home endpoint:', data)),
      catchError(error => {
        console.log('Home API endpoint not available, fetching data individually:', error);
        
        // Fallback to getting each section of data individually
        return this.getHomePageDataIndividually();
      })
    );
  }

  // Fallback method to get homepage data by making separate requests
  private getHomePageDataIndividually(): Observable<{ featuredProducts: Product[], categories: Category[], latestProducts: Product[] }> {
    return forkJoin({
      featuredProducts: this.getFeaturedProducts(8),
      categories: this.getCategories(),
      latestProducts: this.getRecentProducts(4)
    }).pipe(
      tap(data => console.log('Home page data fetched individually:', data)),
      catchError(error => {
        console.error('Error fetching individual data:', error);
        // Return an object with empty arrays as a last resort
        return of({
          featuredProducts: [],
          categories: [],
          latestProducts: []
        });
      })
    );
  }

  // Get mock products for testing (use this when API is not available)
  getMockProducts(count: number = 8): Product[] {
    const mockProducts: Product[] = [];
    
    for (let i = 1; i <= count; i++) {
      mockProducts.push({
        productId: i,
        name: `Product ${i}`,
        description: `This is a description for product ${i}`,
        price: 1000 + (i * 100),
        imageUrl: `https://picsum.photos/id/${20 + i}/400/400`,
        categoryId: (i % 5) + 1,
        categoryName: `Category ${(i % 5) + 1}`,
        stockQuantity: i % 3 === 0 ? 0 : 10 + i
      });
    }
    
    return mockProducts;
  }

  // Get mock categories for testing
  getMockCategories(): Category[] {
    return [
      new Category(1, 'Clothing', 'All types of clothing', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2xvdGhpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'),
      new Category(2, 'Electronics', 'Electronic devices and accessories', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZWxlY3Ryb25pY3N8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'),
      new Category(3, 'Shoes', 'Footwear for all occasions', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c2hvZXN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'),
      new Category(4, 'Accessories', 'Fashion accessories', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1589820290863-41a01f78f08c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWNjZXNzb3JpZXN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'),
      new Category(5, 'Home & Living', 'Home decoration and furniture', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1560440021-33f9b867899d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aG9tZSUyMGRlY29yfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60'),
      new Category(6, 'Beauty', 'Beauty and personal care products', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmVhdXR5JTIwcHJvZHVjdHN8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60'),
      new Category(7, 'Sports', 'Sports equipment and clothing', null, new Date(), new Date(), 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3BvcnRzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60')
    ];
  }
}