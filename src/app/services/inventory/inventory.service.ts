import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, forkJoin, BehaviorSubject } from 'rxjs';
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

export interface InventoryUpdate {
  productId: number;
  quantity: number;
  operation: 'decrement' | 'increment' | 'set';
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  // BehaviorSubject to track inventory updates
  private inventoryUpdates$ = new BehaviorSubject<InventoryUpdate[]>([]);
  
  constructor(private http: HttpClient) {}

  // Observable for components to subscribe to inventory updates
  getInventoryUpdates(): Observable<InventoryUpdate[]> {
    return this.inventoryUpdates$.asObservable();
  }

  getAllInventory(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${ADMIN_API_URL}`).pipe(
      catchError(error => {
        console.error('Error fetching all inventory:', error);
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
    return this.http.post<Inventory>(API_URL, inventory).pipe(
      tap(created => {
        this.notifyInventoryUpdate({
          productId: created.product?.productId || 0,
          quantity: created.quantity,
          operation: 'set'
        });
      })
    );
  }

  updateStock(productId: number, quantity: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/stock?change=${quantity}`, {}).pipe(
      tap(updated => {
        this.notifyInventoryUpdate({
          productId: productId,
          quantity: updated.quantity,
          operation: quantity > 0 ? 'increment' : 'decrement'
        });
      }),
      catchError(error => {
        console.error(`Error updating stock for product ${productId}:`, error);
        return this.http.put<Inventory>(`${ADMIN_API_URL}/${productId}/stock?change=${quantity}`, {}).pipe(
          tap(updated => {
            this.notifyInventoryUpdate({
              productId: productId,
              quantity: updated.quantity,
              operation: quantity > 0 ? 'increment' : 'decrement'
            });
          }),
          catchError(adminError => {
            console.error(`Error updating stock with admin API for product ${productId}:`, adminError);
            return throwError(() => new Error(`Failed to update stock for product ID: ${productId}`));
          })
        );
      })
    );
  }

  /**
   * CRITICAL: Decrement inventory for multiple products (used when order is placed)
   */
  decrementInventoryForOrder(orderItems: Array<{productId: number, quantity: number}>): Observable<Inventory[]> {
    console.log('=== DECREMENTING INVENTORY FOR ORDER ===');
    console.log('Order items to decrement:', orderItems);
    
    const decrementRequests = orderItems.map(item => {
      const decrementAmount = -Math.abs(item.quantity); // Ensure negative for decrement
      console.log(`Decrementing product ${item.productId} by ${decrementAmount}`);
      
      return this.updateStock(item.productId, decrementAmount).pipe(
        tap(result => {
          console.log(`Successfully decremented product ${item.productId}:`, result);
        }),
        catchError(error => {
          console.error(`Failed to decrement inventory for product ${item.productId}:`, error);
          return of(null);
        })
      );
    });

    return forkJoin(decrementRequests).pipe(
      map(results => results.filter(result => result !== null) as Inventory[]),
      tap(results => {
        console.log('=== INVENTORY DECREMENT COMPLETED ===');
        console.log('Final inventory results:', results);
        
        // Notify all components about the inventory changes
        results.forEach(inventory => {
          if (inventory && inventory.product) {
            this.notifyInventoryUpdate({
              productId: inventory.product.productId,
              quantity: inventory.quantity,
              operation: 'decrement'
            });
          }
        });
      })
    );
  }

  /**
   * Restore inventory for cancelled orders
   */
  restoreInventoryForCancelledOrder(orderItems: Array<{productId: number, quantity: number}>): Observable<Inventory[]> {
    console.log('=== RESTORING INVENTORY FOR CANCELLED ORDER ===');
    console.log('Order items to restore:', orderItems);
    
    const restoreRequests = orderItems.map(item => {
      const restoreAmount = Math.abs(item.quantity); // Ensure positive for restore
      console.log(`Restoring product ${item.productId} by ${restoreAmount}`);
      
      return this.updateStock(item.productId, restoreAmount).pipe(
        tap(result => {
          console.log(`Successfully restored product ${item.productId}:`, result);
        }),
        catchError(error => {
          console.error(`Failed to restore inventory for product ${item.productId}:`, error);
          return of(null);
        })
      );
    });

    return forkJoin(restoreRequests).pipe(
      map(results => results.filter(result => result !== null) as Inventory[]),
      tap(results => {
        console.log('=== INVENTORY RESTORE COMPLETED ===');
        console.log('Final restore results:', results);
      })
    );
  }

  /**
   * Real-time inventory check for a specific product
   */
  checkRealTimeInventory(productId: number): Observable<number> {
    return this.getInventoryByProductId(productId).pipe(
      map(inventory => inventory.quantity),
      catchError(error => {
        console.error(`Error checking real-time inventory for product ${productId}:`, error);
        return of(0);
      })
    );
  }

  setLowStockThreshold(productId: number, threshold: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${API_URL}/${productId}/threshold?threshold=${threshold}`, {}).pipe(
      catchError(error => {
        console.error(`Error setting threshold for product ${productId}:`, error);
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
        
        return this.http.get<Inventory[]>(`${ADMIN_API_URL}/low-stock`).pipe(
          tap(items => console.log('Low stock items from admin API:', items)),
          catchError(adminError => {
            console.error('Error fetching low stock items from admin API:', adminError);
            
            return this.getAllInventory().pipe(
              map(inventory => {
                return inventory.filter(item => {
                  const threshold = item.lowStockThreshold || 10;
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
      tap(updated => {
        this.notifyInventoryUpdate({
          productId: productId,
          quantity: updated.quantity,
          operation: quantity > 0 ? 'increment' : 'decrement'
        });
      }),
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

  /**
   * CRITICAL: Private method to notify components about inventory updates
   */
  private notifyInventoryUpdate(update: InventoryUpdate): void {
    console.log('Notifying inventory update:', update);
    const currentUpdates = this.inventoryUpdates$.value;
    this.inventoryUpdates$.next([...currentUpdates, update]);
    
    // Clear updates after 5 seconds to prevent memory buildup
    setTimeout(() => {
      this.clearInventoryUpdates();
    }, 5000);
  }

  /**
   * Clear inventory update notifications
   */
  clearInventoryUpdates(): void {
    this.inventoryUpdates$.next([]);
  }
}