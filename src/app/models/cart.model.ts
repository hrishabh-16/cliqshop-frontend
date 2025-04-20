import { Product } from './product.model';

export interface Cart {
  cartId: number;
  userId: number;
  totalPrice: number;
  items: CartItem[];
}

export interface CartItem {
  cartItemId: number;
  product?: Product;  // Keep this for backward compatibility
  productId?: number;
  productName?: string;
  productPrice?: number;
  productImageUrl?: string;
  quantity: number;
  price?: number;
  subTotal?: number;
}

// Helper function to standardize cart item structure
export function normalizeCartItem(item: CartItem): CartItem {
  // If the item already has a product object, return it as is
  if (item.product) {
    return item;
  }
  
  // Otherwise, create a product object from the flat properties
  return {
    ...item,
    product: {
      productId: item.productId || 0,
      name: item.productName || '',
      price: item.productPrice || 0,
      imageUrl: item.productImageUrl || '',
      stockQuantity: undefined,  // Default to undefined as it's not available from API
      description: '',  // Default to an empty string
      categoryId: 0     // Default to 0
    }
  };
}

// Helper function to normalize the entire cart
export function normalizeCart(cart: Cart | null): Cart | null {
  if (!cart) return null;
  
  return {
    ...cart,
    items: Array.isArray(cart.items) ? cart.items.map(normalizeCartItem) : []
  };
}