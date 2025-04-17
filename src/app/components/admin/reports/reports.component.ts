import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService, SalesReport, InventoryReport } from '../../../services/report/report.service';
import { InventoryService, Inventory } from '../../../services/inventory/inventory.service';
import { ProductService } from '../../../services/product/product.service';
import { forkJoin, Subscription, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone:false,
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, OnDestroy {
  activeTab: 'sales' | 'inventory' = 'sales';
  salesReport: SalesReport | null = null;
  inventoryReport: InventoryReport | null = null;
  lowStockItems: Inventory[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Store chart instances for cleanup and updates
  salesCharts: { [key: string]: Chart } = {};
  inventoryCharts: { [key: string]: Chart } = {};
  
  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportService: ReportService,
    private inventoryService: InventoryService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    // Determine which tab to show based on the route
    const routeSub = this.route.data.subscribe(data => {
      if (data['reportType']) {
        this.activeTab = data['reportType'] as 'sales' | 'inventory';
      } else {
        // Extract from URL if not in route data
        const url = this.router.url;
        if (url.includes('/inventory')) {
          this.activeTab = 'inventory';
        } else {
          this.activeTab = 'sales';
        }
      }
    });
    this.subscriptions.push(routeSub);

    // Load data when component initializes
    this.loadReports();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Destroy charts to prevent memory leaks
    Object.values(this.salesCharts).forEach(chart => chart.destroy());
    Object.values(this.inventoryCharts).forEach(chart => chart.destroy());
  }

  loadReports(): void {
    this.isLoading = true;
    this.error = null;
    this.lowStockItems = []; // Reset low stock items
  
    // Get combined report data
    const reportSub = this.reportService.getCombinedReport().pipe(
      tap(data => {
        this.salesReport = data.sales;
        this.inventoryReport = data.inventory;
      }),
      // Get low stock items with product details
      switchMap(() => {
        return this.inventoryService.getLowStockItems().pipe(
          catchError(err => {
            console.error('Failed to fetch low stock items:', err);
            
            // Try alternative: get all inventory and filter
            return this.inventoryService.getAllInventory().pipe(
              map(items => {
                const threshold = this.inventoryReport?.lowStockThreshold || 10;
                return items.filter(item => 
                  item.quantity < (item.lowStockThreshold || threshold)
                );
              }),
              catchError(err2 => {
                console.error('Failed to fetch all inventory:', err2);
                this.error = 'Failed to load inventory data. Please try again later.';
                return of([]);
              })
            );
          })
        );
      }),
      // Enrich with product details if missing
      switchMap(lowStockItems => {
        this.lowStockItems = lowStockItems || [];
        
        // Ensure we have product details
        if (this.lowStockItems.length > 0) {
          const productRequests = this.lowStockItems
            .filter(item => !item.product || !item.product.name)
            .map(item => {
              const productId = item.product?.productId;
              if (productId) {
                return this.productService.getProductById(productId).pipe(
                  tap(product => {
                    item.product = {
                      productId: product.productId,
                      name: product.name,
                      price: product.price
                    };
                  }),
                  catchError(err => {
                    console.error(`Failed to fetch details for product ${productId}:`, err);
                    return of(null);
                  })
                );
              }
              return of(null);
            });
          
          if (productRequests.length > 0) {
            return forkJoin(productRequests).pipe(map(() => this.lowStockItems));
          }
        }
        
        return of(this.lowStockItems);
      })
    ).subscribe({
      next: () => {
        this.isLoading = false;
        // Update inventory report with actual low stock count
        if (this.inventoryReport) {
          this.inventoryReport.lowStockItems = this.lowStockItems.length;
        }
        
        console.log('Low stock items:', this.lowStockItems);
        
        setTimeout(() => {
          this.initCharts();
        }, 100);
      },
      error: (err) => {
        console.error('Failed to load reports:', err);
        this.error = 'Failed to load reports. Please try again later.';
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(reportSub);
  }
  

  calculateHealthyStock(): number {
    if (!this.inventoryReport) return 0;
    return Math.max(0, this.inventoryReport.totalProducts - (this.lowStockItems?.length || 0));
  }
  
  calculateAvgItemsPerCategory(): string {
    if (!this.inventoryReport || this.inventoryReport.totalProducts === 0) return '0';
    return (this.inventoryReport.totalProducts / 5).toFixed(0);
  }
  
  calculateAvgValuePerItem(): string {
    if (!this.inventoryReport || this.inventoryReport.totalProducts === 0) return '0';
    return (this.inventoryReport.totalValue / this.inventoryReport.totalProducts).toFixed(0);
  }
  
  initCharts(): void {
    // Initialize charts based on active tab
    if (this.activeTab === 'sales' && this.salesReport) {
      this.initSalesCharts();
    } else if (this.activeTab === 'inventory' && this.inventoryReport) {
      this.initInventoryCharts();
    }
  }

  initSalesCharts(): void {
    if (!this.salesReport) return;
    
    // Order Status Distribution (Pie Chart)
    const statusLabels = Object.keys(this.salesReport.statusDistribution || {});
    const statusData = Object.values(this.salesReport.statusDistribution || {});
    
    this.createPieChart('orderStatusChart', 'Order Status Distribution', 
      statusLabels, statusData, 
      ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']);
    
    // Monthly Orders Distribution (Bar Chart) - Using sample data as we don't have monthly breakdown
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const orderData = this.generateSampleData(this.salesReport.totalOrders);
    
    this.createBarChart('ordersChart', 'Monthly Orders', 
      months, orderData, 
      'rgba(79, 70, 229, 0.6)', 'rgba(79, 70, 229, 1)');
    
    // Monthly Revenue Trend (Line Chart) - Using sample data
    const revenueData = this.generateSampleData(this.salesReport.totalRevenue);
    
    this.createLineChart('revenueChart', 'Monthly Revenue', 
      months, revenueData, 
      'rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 1)');
  }

  initInventoryCharts(): void {
    if (!this.inventoryReport) return;
    
    // Ensure the chart container exists
    const chartContainer = document.getElementById('inventoryValueChart');
    if (!chartContainer) return;
    
    // Inventory Value Distribution (Pie Chart)
    const healthyStock = this.inventoryReport.totalProducts - this.lowStockItems.length;
    const lowStock = this.lowStockItems.length;
    
    this.createPieChart('inventoryValueChart', 'Inventory Value Distribution', 
      ['Healthy Stock', 'Low Stock', 'Reserved'], 
      [
        this.inventoryReport.totalValue * (healthyStock / Math.max(this.inventoryReport.totalProducts, 1)), 
        this.inventoryReport.totalValue * (lowStock / Math.max(this.inventoryReport.totalProducts, 1)), 
        this.inventoryReport.totalValue * 0.05 // 5% reserved
      ], 
      ['#10B981', '#EF4444', '#8B5CF6']);
  }
  
  createPieChart(id: string, label: string, labels: string[], data: number[], backgroundColor: string[]): void {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (this.salesCharts[id]) {
      this.salesCharts[id].destroy();
    }
    
    // Create new chart with maintained aspect ratio
    this.salesCharts[id] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor.map(color => color.replace('0.6', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 20
            }
          },
          title: {
            display: true,
            text: label,
            font: {
              size: 16
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  createBarChart(id: string, label: string, labels: string[], data: number[], backgroundColor: string, borderColor: string): void {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (this.salesCharts[id]) {
      this.salesCharts[id].destroy();
    }
    
    // Create new chart
    this.salesCharts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  createLineChart(id: string, label: string, labels: string[], data: number[], backgroundColor: string, borderColor: string): void {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (this.salesCharts[id]) {
      this.salesCharts[id].destroy();
    }
    
    // Create new chart
    this.salesCharts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          fill: true,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Helper function to generate sample data for charts
  // This is used for demonstration since we don't have monthly data from the API
  generateSampleData(total: number): number[] {
    const data = [];
    let remaining = total;
    
    for (let i = 0; i < 11; i++) {
      // Generate a random percentage between 5% and 25%
      const factor = Math.random() * 0.2 + 0.05;
      const value = Math.round(total * factor);
      data.push(value);
      remaining -= value;
    }
    
    // Add the remaining amount to the last month
    data.push(Math.max(0, remaining));
    return data;
  }

  switchTab(tab: 'sales' | 'inventory'): void {
    this.activeTab = tab;
    
    // Navigate to the appropriate route
    this.router.navigate(['/admin/reports', tab]);
    
    // Initialize charts for the active tab
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }
}