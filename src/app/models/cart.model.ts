import { Product } from './product.model';

export interface Cart {
  cartId: number;
  userId: number;
  totalPrice: number;
  items: CartItem[];
}

export interface CartItem {
  cartItemId: number;
  product: Product;
  quantity: number;
  price: number;
}