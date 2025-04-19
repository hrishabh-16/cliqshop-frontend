import { User } from './user.model';

export interface Address {
  addressId: number | null;
  user: User;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  addressType: AddressType;
}

export type AddressType = 'SHIPPING' | 'BILLING' | 'BOTH';