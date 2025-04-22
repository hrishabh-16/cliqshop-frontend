import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { InventoryService, Inventory } from '../../../services/inventory/inventory.service';
import { ProductService } from '../../../services/product/product.service';
import { CategoryService } from '../../../services/category/category.service';
interface WarehouseLocation {
  id?: number;
  name: string;
  code: string;
}

// Define the Product interface to match what you're getting from the API
interface Product {
  productId: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  description?: string;
  inventoryQuantity?: number;
  hasInventory?: boolean;
}

// Define the ProductsResponse interface to match your API response
interface ProductsResponse {
  products: Product[];
  count: number;
  // Add any other properties that your API returns
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  standalone: false,
})
export class InventoryComponent implements OnInit, OnDestroy {
  // View control
  currentView: string = 'products'; // Default to products view
  loading = true;
  error: string | null = null;
  
  // Product data
  products: Product[] = [];
  filteredProducts: Product[] = [];
  totalProducts = 0;
  productSearchQuery = '';
  currentProductPage = 1;
  totalProductPages = 1;
  productPages: number[] = [];
  
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
  showAddStockModal = false;
  showUpdateStockModal = false;
  showUpdateThresholdModal = false;
  showUpdateLocationModal = false;
  showAddLocationModal = false;
  showDeleteLocationModal = false;
  selectedInventory: Inventory | null = null;
  selectedProduct: Product | null = null;
  selectedLocation: WarehouseLocation | null = null;
  
  // Form data
  stockUpdateType = 'add'; // 'add', 'subtract', 'set'
  stockChangeAmount = 0;
  newThreshold = 10;
  newLocation = '';
  newLocationData: WarehouseLocation = { name: '', code: '' };
  editingLocation = false;
  
  // Submission state
  isSubmitting = false;
  
  private subscriptions = new Subscription();
  
  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
    public categoryService: ProductService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadProducts();
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
    
    if (view === 'products') {
      this.loadProducts();
    } else if (view === 'stock') {
      this.loadInventory();
    } else if (view === 'lowStock') {
      this.loadLowStockItems();
    } else if (view === 'warehouse') {
      this.loadWarehouseLocations();
    }
    
    // Reset pagination when changing views
    this.currentPage = 1;
    this.currentProductPage = 1;
    this.generatePagesArray();
    this.generateProductPagesArray();
  }
  
  // Data Loading
  loadProducts(): void {
    this.loading = true;
    this.error = null;
    
    const sub = this.productService.getAllProducts().pipe(
      map((response: any): Product[] => {
        // Handle different response formats
        let products: any[] = [];
        if (Array.isArray(response)) {
          products = response;
        } else if (response?.products) {
          products = response.products;
        }
        
        // Map products to ensure categoryName is set
        return products.map((product: any) => ({
          ...product,
          categoryName: product.category?.name || product.categoryName || 'None',
          categoryId: product.category?.categoryId || product.categoryId
        })) as Product[];
      })
    ).subscribe({
      next: (products: Product[]) => {
        this.products = products;
        this.totalProducts = products.length;
        this.updateProductsWithInventoryData();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.error = 'Failed to load product data. Please try again later.';
        this.loading = false;
      }
    });
    
    this.subscriptions.add(sub);
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) return 'None';
    
    // First check if we have the category in any loaded product
    const productWithCategory = this.products.find(p => 
      p.categoryId === categoryId
    );
    if (productWithCategory?.categoryName) return productWithCategory.categoryName;
    
    // Then try the category service
    try {
      const name = this.categoryService.getCategoryName(categoryId);
      if (name && name !== 'Unknown') return name;
    } catch (error) {
      console.warn('Error getting category name from service:', error);
    }
    
    return 'None';
  }

  
  updateProductsWithInventoryData(): void {
    if (this.products.length === 0) {
      this.filterProducts();
      this.calculateTotalProductPages();
      this.generateProductPagesArray();
      this.loading = false;
      return;
    }
    
    const productIds = this.products.map(product => product.productId);
    
    const sub = this.inventoryService.getInventoryByProductIds(productIds).subscribe({
      next: (inventoryItems) => {
        // Create a mapping of product IDs to inventory data
        const inventoryMap = new Map<number, Inventory>();
        inventoryItems.forEach(item => {
          if (item.product && item.product.productId) {
            inventoryMap.set(item.product.productId, item);
          }
        });
        
        // Update products with inventory data
        this.products = this.products.map(product => {
          const inventoryItem = inventoryMap.get(product.productId);
          return {
            ...product,
            inventoryQuantity: inventoryItem ? inventoryItem.quantity : 0,
            hasInventory: !!inventoryItem
          };
        });
        
        this.filterProducts();
        this.calculateTotalProductPages();
        this.generateProductPagesArray();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading inventory data for products:', err);
        // Still show products even if we can't get inventory data
        this.filterProducts();
        this.calculateTotalProductPages();
        this.generateProductPagesArray();
        this.loading = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
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
  searchProducts(): void {
    this.filterProducts();
  }
  
  filterProducts(): void {
    if (!this.productSearchQuery) {
      // Apply pagination to products
      const startIndex = (this.currentProductPage - 1) * this.itemsPerPage;
      this.filteredProducts = this.products.slice(startIndex, startIndex + this.itemsPerPage);
    } else {
      // Apply search filter
      const query = this.productSearchQuery.toLowerCase();
      this.filteredProducts = this.products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query) ||
        (product.categoryName || '').toLowerCase().includes(query)
      );
    }
  }
  
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
  
  // Pagination for inventory
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
  
  // Pagination for products
  calculateTotalProductPages(): void {
    this.totalProductPages = Math.ceil(this.totalProducts / this.itemsPerPage);
  }
  
  generateProductPagesArray(): void {
    this.productPages = [];
    const startPage = Math.max(1, this.currentProductPage - 2);
    const endPage = Math.min(this.totalProductPages, this.currentProductPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      this.productPages.push(i);
    }
  }
  
  goToProductPage(page: number): void {
    if (page !== this.currentProductPage) {
      this.currentProductPage = page;
      this.filterProducts();
    }
  }
  
  previousProductPage(): void {
    if (this.currentProductPage > 1) {
      this.currentProductPage--;
      this.filterProducts();
    }
  }
  
  nextProductPage(): void {
    if (this.currentProductPage < this.totalProductPages) {
      this.currentProductPage++;
      this.filterProducts();
    }
  }
  
  // Modal Functions
  openAddStockModal(product: Product): void {
    this.selectedProduct = product;
    this.stockChangeAmount = 0;
    this.newThreshold = 10;
    this.newLocation = '';
    this.showAddStockModal = true;
  }
  
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
    this.showAddStockModal = false;
    this.showUpdateStockModal = false;
    this.showUpdateThresholdModal = false;
    this.showUpdateLocationModal = false;
    this.showAddLocationModal = false;
    this.showDeleteLocationModal = false;
    this.selectedInventory = null;
    this.selectedProduct = null;
    this.selectedLocation = null;
  }
  
  // API Actions
  addProductStock(): void {
    if (!this.selectedProduct || this.stockChangeAmount < 1) return;
    
    this.isSubmitting = true;
    
    // Handle the case where a product doesn't have inventory yet
    if (!this.selectedProduct.hasInventory) {
      // First, we need to create inventory for this product
      const newInventory: Inventory = {
        product: {
          productId: this.selectedProduct.productId,
          name: this.selectedProduct.name,
          price: this.selectedProduct.price,
          imageUrl: this.selectedProduct.imageUrl
        },
        quantity: this.stockChangeAmount,
        lowStockThreshold: this.newThreshold || 10,
        warehouseLocation: this.newLocation
      };
      
      const sub = this.inventoryService.createInventory(newInventory).subscribe({
        next: (createdInventory) => {
          // Update local data
          if (this.selectedProduct) {
            this.selectedProduct.inventoryQuantity = this.stockChangeAmount;
            this.selectedProduct.hasInventory = true;
          }
          
          // Refresh filtered products
          this.filterProducts();
          
          this.isSubmitting = false;
          this.closeModal();
          
          // Optionally, reload inventory data
          this.loadInventory();
        },
        error: (err) => {
          console.error('Error creating inventory:', err);
          this.error = 'Failed to create inventory. Please try again.';
          this.isSubmitting = false;
        }
      });
      
      this.subscriptions.add(sub);
    } else {
      // Update existing inventory
      const sub = this.inventoryService.updateStock(
        this.selectedProduct.productId,
        this.stockChangeAmount
      ).subscribe({
        next: (updatedInventory) => {
          // Update local data
          if (this.selectedProduct) {
            this.selectedProduct.inventoryQuantity = (this.selectedProduct.inventoryQuantity || 0) + this.stockChangeAmount;
          }
          
          // Refresh filtered products
          this.filterProducts();
          
          this.isSubmitting = false;
          this.closeModal();
          
          // Optionally, reload inventory data
          this.loadInventory();
        },
        error: (err) => {
          console.error('Error updating stock:', err);
          this.error = 'Failed to update stock. Please try again.';
          this.isSubmitting = false;
        }
      });
      
      this.subscriptions.add(sub);
    }
  }
  
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
        
        // Also update in products if present
        const productIndex = this.products.findIndex(p => 
          p.productId === this.selectedInventory?.product?.productId
        );
        
        if (productIndex !== -1) {
          this.products[productIndex].inventoryQuantity = updatedInventory.quantity;
          this.filterProducts();
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
  get isProductView(): boolean {
    return this.currentView === 'products';
  }
  
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