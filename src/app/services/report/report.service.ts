import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

const API_URL = 'http://localhost:9000/api/admin/reports';

export interface SalesReport {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  statusDistribution: {[key: string]: number};
}

export interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  lowStockThreshold: number;
}

export interface CombinedReport {
  sales: SalesReport;
  inventory: InventoryReport;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private http: HttpClient) {}

  getCombinedReport(): Observable<CombinedReport> {
    return this.http.get<CombinedReport>(`${API_URL}`).pipe(
      tap(report => console.log('Combined report data:', report)),
      catchError(error => {
        console.error('Error fetching combined report:', error);
        
        // Return a fallback with empty reports if API fails
        return of({
          sales: {
            totalOrders: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            statusDistribution: {}
          },
          inventory: {
            totalProducts: 0,
            totalValue: 0,
            lowStockItems: 0,
            lowStockThreshold: 10
          }
        });
      })
    );
  }

  getSalesReport(): Observable<SalesReport> {
    return this.http.get<SalesReport>(`${API_URL}/sales`).pipe(
      tap(report => console.log('Sales report data:', report)),
      catchError(error => {
        console.error('Error fetching sales report:', error);
        
        // Return a fallback if API fails
        return of({
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          statusDistribution: {}
        });
      })
    );
  }

  getInventoryReport(): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${API_URL}/inventory`).pipe(
      tap(report => console.log('Inventory report data:', report)),
      catchError(error => {
        console.error('Error fetching inventory report:', error);
        
        // Return a fallback if API fails
        return of({
          totalProducts: 0,
          totalValue: 0,
          lowStockItems: 0,
          lowStockThreshold: 10
        });
      })
    );
  }
}