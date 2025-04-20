export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  userId: number;
  username: string;
  name: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
}