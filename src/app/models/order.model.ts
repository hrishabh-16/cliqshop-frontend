import { User } from './user.model';
import { Address } from './address.model';
import { Product } from './product.model';

export interface Order {
  orderId: number;
  user: User;
  orderDate: string;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  billingAddress: Address;
  shippingAddress: Address;
  orderItems: OrderItem[];
  orderNotes?: string;
}

export interface OrderItem {
  orderItemId: number;
  product: Product;
  quantity: number;
  price: number;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'cod' | 'card' | 'paypal' | 'upi';
export type ShippingMethod = 'standard' | 'express' | 'next_day' | 'free';