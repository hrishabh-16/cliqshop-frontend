// cliqshop-frontend\src\app\services\category\category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Category } from '../../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:9000/api/categories'; 
  
  // Cache categories to avoid multiple requests
  private cachedCategories: Category[] = [];

  constructor(private http: HttpClient) {
    // Pre-load categories on service initialization
    this.getAllCategories().subscribe(categories => {
      console.log('Preloaded categories:', categories);
    });
  }

  // Get all categories from backend or cache
  getAllCategories(): Observable<Category[]> {
    // Return cached categories if available
    if (this.cachedCategories.length > 0) {
      console.log('Returning cached categories:', this.cachedCategories);
      return of(this.cachedCategories);
    }
    
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(categories => {
        console.log('Raw category data from API:', categories);
        
        // Map the response to ensure proper Category objects
        const mappedCategories = categories.map(category => {
          // Ensure we have a valid ID (handle API inconsistency)
          const categoryId = category.categoryId !== undefined ? category.categoryId : 
                            (category.id !== undefined ? category.id : 0);
          
          const mappedCategory = new Category(
            categoryId,
            category.name || 'Unknown Category',
            category.description || '',
            category.parentId || null,
            category.createdAt ? new Date(category.createdAt) : new Date(),
            category.updatedAt ? new Date(category.updatedAt) : new Date()
          );
          
          return mappedCategory;
        });
        
        // Update cache
        this.cachedCategories = mappedCategories;
        console.log('Mapped and cached categories:', this.cachedCategories);
        
        return mappedCategories;
      }),
      catchError(error => {
        console.error('Error fetching categories:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  // Get a single category by ID
  getCategoryById(id: number): Observable<Category | null> {
    // Check cache first
    const cachedCategory = this.cachedCategories.find(c => c.id === id || c.categoryId === id);
    if (cachedCategory) {
      return of(cachedCategory);
    }
    
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(category => {
        const categoryId = category.categoryId !== undefined ? category.categoryId : 
                          (category.id !== undefined ? category.id : 0);
        
        return new Category(
          categoryId,
          category.name || 'Unknown Category',
          category.description || '',
          category.parentId || null,
          category.createdAt ? new Date(category.createdAt) : new Date(),
          category.updatedAt ? new Date(category.updatedAt) : new Date()
        );
      }),
      catchError(error => {
        console.error(`Error fetching category ID ${id}:`, error);
        return of(null);
      })
    );
  }
  
  // Find category name by ID (sync method)
  getCategoryNameById(id: number): string {
    if (!id) return 'Unknown';
    
    const category = this.cachedCategories.find(c => 
      c.id === id || c.categoryId === id
    );
    return category ? category.name : 'Unknown';
  }
}