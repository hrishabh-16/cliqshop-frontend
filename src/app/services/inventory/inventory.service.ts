import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const API_URL = 'http://localhost:9000/api/inventory';
const ADMIN_API_URL = 'http://localhost:9000/api/admin/inventory';

export interface Inventory {
  inventoryId?: number;
  product?: {
    productId: number;
    name: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  lowStockThreshold?: number;
  warehouseLocation?: string;
  lastRestocked?: string;
  lastUpdated?: string;
  sku?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  constructor(private http: HttpClient) {}

  getAllInventory(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${ADMIN_API_URL}`).pipe(
      catchError(error => {
        console.error('Error fetching all inventory:', error);
        // Try with admin API if regular fails
        return this.http.get<Inventory[]>(`${API_URL}`).pipe(
          catchError(adminError => {
            console.error('Error fetching all inventory from admin API:', adminError);
            return of([]);
          })
        );
      })
    );
  }

  getInventoryByProductIds(productIds: number[]): Observable<Inventory[]> {
    if (productIds.length === 0) {
      return of([]);
    }

    const requests = productIds.map(id => 
      this.getInventoryByProductId(id).pipe(
        catchError(err => {
          console.error(`Error fetching inventory for product ${id}:`, err);
          return of(null);
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => results.filter(result => result !== null) as Inventory[])
    );
  }

  getInventoryByProductId(productId: number): Observable<Inventory> {
    return this.http.get<Inventory>(`${API_URL}/product/${productId}`).pipe(
      catchError(error => {
        console.error(`Error fetching inventory for product ${productId}:`, error);
        return throwError(() => new Error(`Inventory not found for product ID: ${productId}`));
      })
    );
  }

  createInventory(inventory: Inventory): Observable<Inventory> {
    return this.http.post<Inventory>(API_URL, inventory);
  }

  updateStock(productId: number, quantity: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/stock?change=${quantity}`, {}).pipe(
      catchError(error => {
        console.error(`Error updating stock for product ${productId}:`, error);
        // Try with admin API if regular fails
        return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/stock?change=${quantity}`, {}).pipe(
          catchError(adminError => {
            console.error(`Error updating stock with admin API for product ${productId}:`, adminError);
            return throwError(() => new Error(`Failed to update stock for product ID: ${productId}`));
          })
        );
      })
    );
  }

  setLowStockThreshold(productId: number, threshold: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/threshold?threshold=${threshold}`, {}).pipe(
      catchError(error => {
        console.error(`Error setting threshold for product ${productId}:`, error);
        // Try with admin API if regular fails
        return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/threshold?threshold=${threshold}`, {}).pipe(
          catchError(adminError => {
            console.error(`Error setting threshold with admin API for product ${productId}:`, adminError);
            return throwError(() => new Error(`Failed to set threshold for product ID: ${productId}`));
          })
        );
      })
    );
  }

  getLowStockItems(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${API_URL}/low-stock`).pipe(
      tap(items => console.log('Low stock items from API:', items)),
      catchError(error => {
        console.error('Error fetching low stock items:', error);
        
        // Try admin endpoint if regular endpoint fails
        return this.http.get<Inventory[]>(`${ADMIN_API_URL}/low-stock`).pipe(
          tap(items => console.log('Low stock items from admin API:', items)),
          catchError(adminError => {
            console.error('Error fetching low stock items from admin API:', adminError);
            
            // As a fallback, calculate low stock items from all inventory
            return this.getAllInventory().pipe(
              map(inventory => {
                return inventory.filter(item => {
                  const threshold = item.lowStockThreshold || 10; // Default threshold
                  return item.quantity <= threshold;
                });
              })
            );
          })
        );
      })
    );
  }

  updateWarehouseLocation(productId: number, location: string): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/location?location=${encodeURIComponent(location)}`, {}).pipe(
      catchError(error => {
        console.error(`Error updating location for product ${productId}:`, error);
        return throwError(() => new Error(`Failed to update location for product ID: ${productId}`));
      })
    );
  }

  deleteInventory(inventoryId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${inventoryId}`).pipe(
      catchError(error => {
        console.error(`Error deleting inventory ${inventoryId}:`, error);
        return throwError(() => new Error(`Failed to delete inventory ID: ${inventoryId}`));
      })
    );
  }

  // Admin specific endpoints
  adminGetAllInventory(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${ADMIN_API_URL}`).pipe(
      catchError(error => {
        console.error('Error fetching all inventory from admin API:', error);
        return of([]);
      })
    );
  }

  adminUpdateStock(productId: number, quantity: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/stock?change=${quantity}`, {}).pipe(
      catchError(error => {
        console.error(`Error updating stock with admin API for product ${productId}:`, error);
        return throwError(() => new Error(`Failed to update stock for product ID: ${productId}`));
      })
    );
  }

  adminUpdateThreshold(productId: number, threshold: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/threshold?threshold=${threshold}`, {}).pipe(
      catchError(error => {
        console.error(`Error setting threshold with admin API for product ${productId}:`, error);
        return throwError(() => new Error(`Failed to set threshold for product ID: ${productId}`));
      })
    );
  }
  
  // Get products with their inventory status
  getProductsWithInventoryStatus(): Observable<any[]> {
    return this.getAllInventory().pipe(
      map(inventories => {
        return inventories.map(inventory => {
          const isLowStock = inventory.quantity < (inventory.lowStockThreshold || 10);
          return {
            ...inventory,
            isLowStock
          };
        });
      })
    );
  }
}