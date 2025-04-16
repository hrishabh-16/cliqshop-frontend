export class Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: number;
  stockQuantity?: number;
  selected?: boolean;

  constructor(
    productId: number,
    name: string,
    description: string,
    price: number,
    imageUrl: string,
    categoryId: number ,
    stockQuantity?: number,
    selected?: boolean,
  ) {
    this.productId = productId;
    this.name = name;
    this.description = description;
    this.price = price;
    this.imageUrl = imageUrl;
    this.categoryId = categoryId;
    this.stockQuantity = stockQuantity;
    this.selected = selected;
  }
}