import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InventoryService, Inventory } from '../../../services/inventory/inventory.service';
import { ProductService } from '../../../services/product/product.service';

interface WarehouseLocation {
  id?: number;
  name: string;
  code: string;
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  standalone: false,
})
export class InventoryComponent implements OnInit, OnDestroy {
  // View control
  currentView: string = 'stock';
  loading = true;
  error: string | null = null;
  
  // Inventory data
  inventory: Inventory[] = [];
  filteredInventory: Inventory[] = [];
  lowStockItems: Inventory[] = [];
  filteredLowStockItems: Inventory[] = [];
  warehouseLocations: WarehouseLocation[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalInventoryItems = 0;
  totalPages = 1;
  pages: number[] = [];
  
  // Search and filters
  searchQuery = '';
  lowStockFilter = 'all'; // 'all', 'outOfStock', 'critical', 'warning'
  
  // Modal controls
  showUpdateStockModal = false;
  showUpdateThresholdModal = false;
  showUpdateLocationModal = false;
  showAddLocationModal = false;
  showDeleteLocationModal = false;
  selectedInventory: Inventory | null = null;
  selectedLocation: WarehouseLocation | null = null;
  
  // Form data
  stockUpdateType = 'add'; // 'add', 'subtract', 'set'
  stockChangeAmount = 0;
  newThreshold = 0;
  newLocation = '';
  newLocationData: WarehouseLocation = { name: '', code: '' };
  editingLocation = false;
  
  // Submission state
  isSubmitting = false;
  
  private subscriptions = new Subscription();
  
  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadInventory();
    this.loadWarehouseLocations();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  // Navigation
  navigateBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
  
  changeView(view: string): void {
    this.currentView = view;
    
    if (view === 'lowStock') {
      this.loadLowStockItems();
    } else if (view === 'warehouse') {
      this.loadWarehouseLocations();
    }
    
    // Reset pagination when changing views
    this.currentPage = 1;
    this.generatePagesArray();
  }
  
  // Data Loading
  loadInventory(): void {
    this.loading = true;
    this.error = null;
    
    const sub = this.inventoryService.getAllInventory().subscribe({
      next: (data) => {
        this.inventory = data;
        this.totalInventoryItems = data.length;
        this.filterInventoryItems();
        this.calculateTotalPages();
        this.generatePagesArray();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading inventory:', err);
        this.error = 'Failed to load inventory data. Please try again later.';
        this.loading = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  loadLowStockItems(): void {
    this.loading = true;
    this.error = null;
    
    const sub = this.inventoryService.getLowStockItems().subscribe({
      next: (data) => {
        this.lowStockItems = data;
        this.filterLowStockItems();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading low stock items:', err);
        this.error = 'Failed to load low stock data. Please try again later.';
        this.loading = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  loadWarehouseLocations(): void {
    // In a real application, you would get this from an API
    // For this example, we'll use mock data
    this.warehouseLocations = [
      { id: 1, name: 'Main Warehouse', code: 'WH-MAIN' },
      { id: 2, name: 'East Wing', code: 'WH-EAST' },
      { id: 3, name: 'West Wing', code: 'WH-WEST' },
      { id: 4, name: 'Storage Room A', code: 'SR-A' },
      { id: 5, name: 'Storage Room B', code: 'SR-B' }
    ];
  }
  
  // Filtering Functions
  searchInventory(): void {
    this.filterInventoryItems();
  }
  
  filterInventoryItems(): void {
    if (!this.searchQuery) {
      // Apply pagination to inventory items
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      this.filteredInventory = this.inventory.slice(startIndex, startIndex + this.itemsPerPage);
    } else {
      // Apply search filter
      const query = this.searchQuery.toLowerCase();
      this.filteredInventory = this.inventory.filter(item => 
        item.product?.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.warehouseLocation?.toLowerCase().includes(query)
      );
    }
  }
  
  filterLowStockItems(): void {
    switch(this.lowStockFilter) {
      case 'outOfStock':
        this.filteredLowStockItems = this.lowStockItems.filter(item => item.quantity <= 0);
        break;
      case 'critical':
        this.filteredLowStockItems = this.lowStockItems.filter(item => item.quantity > 0 && item.quantity <= 5);
        break;
      case 'warning':
        this.filteredLowStockItems = this.lowStockItems.filter(item => item.quantity > 5);
        break;
      case 'all':
      default:
        this.filteredLowStockItems = this.lowStockItems;
        break;
    }
  }
  
  // Pagination
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalInventoryItems / this.itemsPerPage);
  }
  
  generatePagesArray(): void {
    this.pages = [];
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }
  
  goToPage(page: number): void {
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.filterInventoryItems();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.filterInventoryItems();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.filterInventoryItems();
    }
  }
  
  // Modal Functions
  openUpdateStockModal(item: Inventory): void {
    this.selectedInventory = item;
    this.stockUpdateType = 'add';
    this.stockChangeAmount = 0;
    this.showUpdateStockModal = true;
  }
  
  openUpdateThresholdModal(item: Inventory): void {
    this.selectedInventory = item;
    this.newThreshold = item.lowStockThreshold || 10;
    this.showUpdateThresholdModal = true;
  }
  
  openUpdateLocationModal(item: Inventory): void {
    this.selectedInventory = item;
    this.newLocation = item.warehouseLocation || '';
    this.showUpdateLocationModal = true;
  }
  
  openAddLocationModal(): void {
    this.editingLocation = false;
    this.newLocationData = { name: '', code: '' };
    this.showAddLocationModal = true;
  }
  
  editLocation(location: WarehouseLocation): void {
    this.editingLocation = true;
    this.selectedLocation = location;
    this.newLocationData = { ...location };
    this.showAddLocationModal = true;
  }
  
  confirmDeleteLocation(location: WarehouseLocation): void {
    this.selectedLocation = location;
    this.showDeleteLocationModal = true;
  }
  
  closeModal(): void {
    this.showUpdateStockModal = false;
    this.showUpdateThresholdModal = false;
    this.showUpdateLocationModal = false;
    this.showAddLocationModal = false;
    this.showDeleteLocationModal = false;
    this.selectedInventory = null;
    this.selectedLocation = null;
  }
  
  // API Actions
  updateStock(): void {
    if (!this.selectedInventory || this.stockChangeAmount < 0) return;
    
    this.isSubmitting = true;
    
    let change: number;
    
    if (this.stockUpdateType === 'add') {
      change = this.stockChangeAmount;
    } else if (this.stockUpdateType === 'subtract') {
      change = -this.stockChangeAmount;
    } else { // 'set'
      change = this.stockChangeAmount - (this.selectedInventory.quantity || 0);
    }
    
    const sub = this.inventoryService.updateStock(
      this.selectedInventory.product?.productId || 0, 
      change
    ).subscribe({
      next: (updatedInventory) => {
        // Update local data
        const index = this.inventory.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (index !== -1) {
          this.inventory[index] = updatedInventory;
        }
        
        this.filterInventoryItems();
        
        // Also update in low stock items if present
        const lowStockIndex = this.lowStockItems.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (lowStockIndex !== -1) {
          this.lowStockItems[lowStockIndex] = updatedInventory;
          this.filterLowStockItems();
        }
        
        this.isSubmitting = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('Error updating stock:', err);
        this.error = 'Failed to update stock. Please try again.';
        this.isSubmitting = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  updateThreshold(): void {
    if (!this.selectedInventory || this.newThreshold < 1) return;
    
    this.isSubmitting = true;
    
    const sub = this.inventoryService.setLowStockThreshold(
      this.selectedInventory.product?.productId || 0,
      this.newThreshold
    ).subscribe({
      next: (updatedInventory) => {
        // Update local data
        const index = this.inventory.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (index !== -1) {
          this.inventory[index] = updatedInventory;
        }
        
        this.filterInventoryItems();
        
        // Also update in low stock items if present
        const lowStockIndex = this.lowStockItems.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (lowStockIndex !== -1) {
          this.lowStockItems[lowStockIndex] = updatedInventory;
          this.filterLowStockItems();
        }
        
        this.isSubmitting = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('Error updating threshold:', err);
        this.error = 'Failed to update threshold. Please try again.';
        this.isSubmitting = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  updateLocation(): void {
    if (!this.selectedInventory || !this.newLocation) return;
    
    this.isSubmitting = true;
    
    const sub = this.inventoryService.updateWarehouseLocation(
      this.selectedInventory.product?.productId || 0,
      this.newLocation
    ).subscribe({
      next: (updatedInventory) => {
        // Update local data
        const index = this.inventory.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (index !== -1) {
          this.inventory[index] = updatedInventory;
        }
        
        this.filterInventoryItems();
        
        // Also update in low stock items if present
        const lowStockIndex = this.lowStockItems.findIndex(item => 
          item.product?.productId === this.selectedInventory?.product?.productId
        );
        
        if (lowStockIndex !== -1) {
          this.lowStockItems[lowStockIndex] = updatedInventory;
          this.filterLowStockItems();
        }
        
        this.isSubmitting = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('Error updating location:', err);
        this.error = 'Failed to update warehouse location. Please try again.';
        this.isSubmitting = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  saveLocation(): void {
    if (!this.newLocationData.name || !this.newLocationData.code) return;
    
    this.isSubmitting = true;
    
    if (this.editingLocation && this.selectedLocation) {
      // Update existing location (mock implementation)
      const index = this.warehouseLocations.findIndex(loc => loc.id === this.selectedLocation?.id);
      
      if (index !== -1) {
        this.warehouseLocations[index] = {
          ...this.warehouseLocations[index],
          name: this.newLocationData.name,
          code: this.newLocationData.code
        };
      }
      
      // In a real application, you would call an API here
      setTimeout(() => {
        this.isSubmitting = false;
        this.closeModal();
      }, 500);
    } else {
      // Add new location (mock implementation)
      const newId = Math.max(...this.warehouseLocations.map(l => l.id || 0)) + 1;
      
      this.warehouseLocations.push({
        id: newId,
        name: this.newLocationData.name,
        code: this.newLocationData.code
      });
      
      // In a real application, you would call an API here
      setTimeout(() => {
        this.isSubmitting = false;
        this.closeModal();
      }, 500);
    }
  }
  
  deleteLocation(): void {
    if (!this.selectedLocation) return;
    
    this.isSubmitting = true;
    
    // Check if any inventory items are using this location
    const itemsUsingLocation = this.inventory.filter(item => 
      item.warehouseLocation === this.selectedLocation?.name
    );
    
    if (itemsUsingLocation.length > 0) {
      this.error = `Cannot delete location. It is currently used by ${itemsUsingLocation.length} inventory items.`;
      this.isSubmitting = false;
      return;
    }
    
    // Remove location (mock implementation)
    this.warehouseLocations = this.warehouseLocations.filter(loc => 
      loc.id !== this.selectedLocation?.id
    );
    
    // In a real application, you would call an API here
    setTimeout(() => {
      this.isSubmitting = false;
      this.closeModal();
      this.error = null;
    }, 500);
  }
  
  // Helper Functions
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  }
  
  getNewStockLevel(): number {
    if (!this.selectedInventory) return 0;
    
    const currentLevel = this.selectedInventory.quantity || 0;
    
    if (this.stockUpdateType === 'add') {
      return currentLevel + this.stockChangeAmount;
    } else if (this.stockUpdateType === 'subtract') {
      return Math.max(0, currentLevel - this.stockChangeAmount);
    } else {
      return this.stockChangeAmount;
    }
  }
  
  getItemCountForLocation(locationName: string): number {
    return this.inventory.filter(item => item.warehouseLocation === locationName).length;
  }
  
  // View Helpers
  get isStockView(): boolean {
    return this.currentView === 'stock';
  }
  
  get isLowStockView(): boolean {
    return this.currentView === 'lowStock';
  }
  
  get isWarehouseView(): boolean {
    return this.currentView === 'warehouse';
  }
}