// import { User } from './user.model';
// import { Address } from './address.model';
// import { Product } from './product.model';

// export interface Order {
//   orderId: number;
//   user: User;
//   orderDate: string;
//   totalPrice: number;
//   status: OrderStatus;
//   paymentMethod: PaymentMethod;
//   shippingMethod: ShippingMethod;
//   billingAddress: Address;
//   shippingAddress: Address;
//   orderItems: OrderItem[];
//   orderNotes?: string;
// }

// export interface OrderItem {
//   orderItemId: number;
//   product: Product;
//   quantity: number;
//   price: number;
// }

// export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
// export type PaymentMethod = 'cod' | 'card' | 'paypal' | 'upi';
// export type ShippingMethod = 'standard' | 'express' | 'next_day' | 'free';

import { Address } from './address.model';
import { Product } from './product.model';

export interface Order {
  orderId: number;
  userId: number;
  orderDate: string;
  orderStatus: OrderStatus;
  orderTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingMethod: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  orderItems: OrderItem[];
  orderNotes?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

export interface OrderItem {
  orderItemId: number;
  product: Product | number; // Can be either a Product object or just a productId
  productId?: number;
  quantity: number;
  price: number;
  productSnapshot?: any; // To store a snapshot of the product at the time of ordering
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface OrderRequest {
  userId: number;
  billingAddressId: number | null;
  shippingAddressId: number | null;
  items: OrderItemRequest[];  // This was previously cartItems
  totalPrice: number;
  shippingMethod: string;
  paymentMethod: string;
  orderNotes?: string | null;
}

export interface OrderItemRequest {
  productId: number;
  quantity: number;
  price: number;
}