

import { User } from './user.model';

export interface Address {
  
  addressId: number | null;
  user?: User;         // Make user optional with '?'
  userId?: number;     // Add userId as an alternative
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  addressType: AddressType;
  name?: string; // Added name field to match template usage
  phone?: string; // Added phone field to match template usage
}

export type AddressType = 'SHIPPING' | 'BILLING' | 'BOTH';