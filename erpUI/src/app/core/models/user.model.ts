export type Role = 'ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'FINANCE' | 'HR';

export interface User {
  email: string;
  role: Role;
  token: string;
}
