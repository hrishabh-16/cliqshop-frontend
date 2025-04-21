// cliqshop-frontend\src\app\models\product.model.ts
export class Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: number;
  categoryName?: string;
  stockQuantity?: number;
  selected?: boolean;
  createdAt?: Date;  // Added datetime fields
  updatedAt?: Date;
  sku?: string;     // Added Stock Keeping Unit
  isActive?: boolean; // Added status flag
  brand?: string; 

  constructor(
    productId: number,
    name: string,
    description: string,
    price: number,
    imageUrl: string,
    categoryId: number,
    categoryName?: string,
    stockQuantity?: number,
    selected?: boolean,
    createdAt?: Date,
    updatedAt?: Date,
    sku?: string,
    isActive?: boolean,
    brand?: string
  ) {
    this.productId = productId;
    this.name = name;
    this.description = description;
    this.price = price;
    this.imageUrl = imageUrl;
    this.categoryId = categoryId;
    this.categoryName = categoryName;
    this.stockQuantity = stockQuantity;
    this.selected = selected;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.sku = sku;
    this.isActive = isActive !== undefined ? isActive : true; // Default to active if not specified
    this.brand = brand;
  }
}