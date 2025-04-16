import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:9000/api/inventory';

export interface Inventory {
  inventoryId?: number;
  productId: number;
  quantity: number;
  lowStockThreshold?: number;
  warehouseLocation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  constructor(private http: HttpClient) {}

  getInventoryByProductId(productId: number): Observable<Inventory> {
    return this.http.get<Inventory>(`${API_URL}/product/${productId}`);
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
    return this.http.get<Inventory[]>(`${API_URL}/low-stock`);
  }

  deleteInventory(inventoryId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${inventoryId}`);
  }
}
