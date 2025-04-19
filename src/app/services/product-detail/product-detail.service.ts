import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Product } from '../../models/product.model';
import { ProductService } from '../product/product.service';

@Injectable({
  providedIn: 'root'
})
export class ProductDetailService {
  private apiUrl = 'http://localhost:9000/api';

  constructor(
    private http: HttpClient,
    private productService: ProductService
  ) { }

  /**
   * Get detailed product information by ID
   * This service extends the basic product service by providing additional
   * product details that might be needed for the detail view
   */
  getProductDetails(id: number): Observable<Product> {
    // We'll leverage the existing product service to get basic product details
    return this.productService.getProductById(id).pipe(
      switchMap(product => {
        // After getting basic product info, we can fetch additional details if needed
        // such as more images, specifications, etc.
        // For now, we'll just return the product as is
        return of(product);
      }),
      catchError(error => {
        console.error(`Error fetching detailed product info for ID ${id}:`, error);
        return throwError(() => new Error(`Failed to load detailed product info with ID ${id}`));
      })
    );
  }

  /**
   * Get product reviews by product ID
   * This would typically come from a separate reviews endpoint
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
   * This would typically come from a separate specifications endpoint
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
}