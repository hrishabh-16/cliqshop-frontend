
import { Address } from './address.model';
import { Product } from './product.model';
import { User } from './user.model';

export interface Order {
  orderId: number;
  userId: number;
  customer?: User;
  orderDate: string;
  orderStatus: OrderStatus;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  orderTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentInfo?: PaymentInfo;
  shippingMethod: string;
  billingAddressId?: number;
  shippingAddressId: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  orderItems: OrderItem[];
  orderNotes?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

export interface OrderItem {
  orderItemId: number;
  orderId?: number;
  product?: Product;
  productId: number;
  quantity: number;
  price: number;
  productSnapshot?: any; // To store a snapshot of the product at the time of ordering
}

export interface PaymentInfo {
  paymentId?: string;
  paymentMethod: string;
  paymentStatus: string;
  cardLast4?: string;
  cardBrand?: string;
  transactionId?: string;
  paymentDate?: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
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
  cartId?: number;
  billingAddressId?: number | null;
  shippingAddressId: number | null;
  items?: OrderItemRequest[];
  paymentMethodId?: string;
  totalPrice?: number;
  shippingMethod: string;
  paymentMethod: string;
  couponCode?: string;
  orderNotes?: string | null;
}

export interface OrderItemRequest {
  productId: number;
  quantity: number;
  price: number;
}

export interface OrderResponse {
  orders: Order[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}