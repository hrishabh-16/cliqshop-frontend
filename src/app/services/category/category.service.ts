  // cliqshop-frontend\src\app\services\category\category.service.ts
  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable, map, catchError, of, tap } from 'rxjs';
  import { Category } from '../../models/category.model';

  @Injectable({
    providedIn: 'root'
  })
  export class CategoryService {
    private apiUrl = 'http://localhost:9000/api/categories';
    // private adminApiUrl = 'http://localhost:9000/api/admin/categories';
    
    // Cache categories to avoid multiple requests
    private cachedCategories: Category[] = [];

    constructor(private http: HttpClient) {
      // Pre-load categories on service initialization
      this.getAllCategories().subscribe(categories => {
        console.log('Preloaded categories:', categories);
      });
    }

    // Get all categories from backend or cache
    getAllCategories(useCache: boolean = true): Observable<Category[]> {
      // Return cached categories if available and requested
      if (useCache && this.cachedCategories.length > 0) {
        console.log('Returning cached categories:', this.cachedCategories);
        return of(this.cachedCategories);
      }
      
      return this.http.get<any[]>(this.apiUrl).pipe(
        map(categories => {
          console.log('Raw category data from API:', categories);
          
          // Map the response to ensure proper Category objects
          const mappedCategories = categories.map(category => this.mapCategoryFromApi(category));
          
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

    // Helper method to map API response to Category model
    private mapCategoryFromApi(category: any): Category {
      // Ensure we have a valid ID (handle API inconsistency)
      const categoryId = category.categoryId !== undefined ? category.categoryId : 
                        (category.id !== undefined ? category.id : 0);
      
      // Generate a placeholder image based on the category name
      const placeholderImage = this.getCategoryPlaceholderImage(category.name);
      
      return new Category(
        categoryId,
        category.name || 'Unknown Category',
        category.description || '',
        null, // parentId
        category.createdAt ? new Date(category.createdAt) : new Date(),
        category.updatedAt ? new Date(category.updatedAt) : new Date(),
        placeholderImage
      );
    }

    // Get a single category by ID
    getCategoryById(id: number): Observable<Category | null> {
      // Check cache first
      const cachedCategory = this.cachedCategories.find(c => c.categoryId === id || c.id === id);
      if (cachedCategory) {
        return of(cachedCategory);
      }
      
      return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
        map(category => this.mapCategoryFromApi(category)),
        catchError(error => {
          console.error(`Error fetching category ID ${id}:`, error);
          return of(null);
        })
      );
    }
    
    // Create a new category
    createCategory(category: { name: string, description: string }): Observable<Category> {
      return this.http.post<any>(`${this.apiUrl}/admin`, category).pipe(
        map(response => this.mapCategoryFromApi(response)),
        tap(newCategory => {
          // Add to cached categories
          this.cachedCategories.push(newCategory);
        }),
        catchError(error => {
          console.error('Error creating category:', error);
          throw error; // Propagate the error to the component
        })
      );
    }

    // Update a category
    updateCategory(id: number, category: { name: string, description: string }): Observable<Category> {
      return this.http.put<any>(`${this.apiUrl}/admin/${id}`, category).pipe(
        map(response => this.mapCategoryFromApi(response)),
        tap(updatedCategory => {
          // Update in cached categories
          const index = this.cachedCategories.findIndex(c => c.categoryId === id || c.id === id);
          if (index !== -1) {
            this.cachedCategories[index] = updatedCategory;
          }
        }),
        catchError(error => {
          console.error(`Error updating category ID ${id}:`, error);
          throw error; // Propagate the error to the component
        })
      );
    }

    // Delete a category
    deleteCategory(id: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/admin/${id}`).pipe(
        tap(() => {
          // Remove from cached categories
          this.cachedCategories = this.cachedCategories.filter(c => c.categoryId !== id && c.id !== id);
        }),
        catchError(error => {
          console.error(`Error deleting category ID ${id}:`, error);
          throw error; // Propagate the error to the component
        })
      );
    }
    
    // Find category name by ID (sync method)
    getCategoryNameById(id: number): string {
      if (!id) return 'Unknown';
      
      const category = this.cachedCategories.find(c => 
        c.categoryId === id || c.id === id
      );
      return category ? category.name : 'Unknown';
    }

    // Clear the categories cache
    clearCache(): void {
      this.cachedCategories = [];
    }

    // Helper method to get a placeholder image for a category
    getCategoryPlaceholderImage(categoryName: string): string {
      // Online placeholder images for categories
      const placeholders: { [key: string]: string } = {
        'electronics': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
        'fashion': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80',
        'books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
        'home': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        'beauty': 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
        'sports': 'https://t4.ftcdn.net/jpg/00/04/43/79/360_F_4437974_DbE4NRiaoRtUeivMyfPoXZFNdCnYmjPq.jpg',
        'toys': 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
        'grocery': 'https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?auto=format&fit=crop&w=400&q=80',
        'furniture': 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80',
        'jewelry': 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
        'shoes': 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80',
        'watches': 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=400&q=80',
        'clothing': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80',
        'accessories': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
        'headphone': 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=400&q=80',
        'wallet': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80',
        'foot': 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80',
        'cap': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'hat': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'bag': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80',
        'women': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'men': 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
        'kid': 'https://images.unsplash.com/photo-1503457574465-494bba506e52?auto=format&fit=crop&w=400&q=80'
      };
    
      // 5 default online images for fallback (pick your favorites or change as needed)
      const defaultImages = [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
        'https://www.bajaao.com/cdn/shop/collections/aud-400x400_250x.jpg?v=1722426461',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80'
      ];
    
      if (categoryName) {
        const lowerCaseName = categoryName.toLowerCase();
        for (const key in placeholders) {
          if (lowerCaseName.includes(key)) {
            return placeholders[key];
          }
        }
      }
    
      // Fallback: pick a default image based on the first letter
      const firstLetter = categoryName ? categoryName.charAt(0).toLowerCase() : 'a';
      const defaultIndex = firstLetter.charCodeAt(0) % defaultImages.length;
      return defaultImages[defaultIndex];
    }
  }    