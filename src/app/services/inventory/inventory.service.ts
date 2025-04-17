import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const API_URL = 'http://localhost:9000/api/inventory';
const ADMIN_API_URL = 'http://localhost:9000/api/admin/inventory';

export interface Inventory {
  inventoryId?: number;
  product?: {
    productId: number;
    name: string;
    price: number;
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
    return this.http.get<Inventory[]>(`${API_URL}`).pipe(
      catchError(error => {
        console.error('Error fetching all inventory:', error);
        // Try with admin API if regular fails
        return this.http.get<Inventory[]>(`${ADMIN_API_URL}`).pipe(
          catchError(adminError => {
            console.error('Error fetching all inventory from admin API:', adminError);
            return of([]);
          })
        );
      })
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
    return this.http.put<Inventory>(`${API_URL}/${productId}/stock?change=${quantity}`, {});
  }

  setLowStockThreshold(productId: number, threshold: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/threshold?threshold=${threshold}`, {});
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
            return throwError(() => new Error('Failed to fetch low stock items'));
          })
        );
      })
    );
  }

  updateWarehouseLocation(productId: number, location: string): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/location?location=${location}`, {});
  }

  deleteInventory(inventoryId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${inventoryId}`);
  }

  // Admin specific endpoints
  adminGetAllInventory(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${ADMIN_API_URL}`);
  }

  adminUpdateStock(productId: number, quantity: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/stock?change=${quantity}`, {});
  }

  adminUpdateThreshold(productId: number, threshold: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/threshold?threshold=${threshold}`, {});
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