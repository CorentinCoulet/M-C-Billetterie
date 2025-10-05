import { UserRole } from './enums/user.enum';

export type BlockedUserBasic = {
  id: string;
  userId: string;
  reason: string;
  createdAt: Date;
}

export type UserWithRelations = {
  id: string;
  name: string | null;
  email: string;
  password: string | null;
  role: string;
  isVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  blocked: BlockedUserBasic | null;
}

export type UserCreateInput = {
  name?: string | null;
  email: string;
  password?: string | null;
  role?: UserRole;
  isVerified?: boolean;
}

export type UserUpdateInput = {
  name?: string | null;
  email?: string;
  password?: string | null;
  role?: UserRole;
  isVerified?: boolean;
}

export type UserWhereInput = {
  id?: string;
  email?: string;
  name?: {
    contains?: string;
    mode?: 'insensitive';
  };
  role?: UserRole;
  AND?: UserWhereInput[];
  OR?: UserWhereInput[];
}

export type UserOrderByInput = {
  id?: 'asc' | 'desc';
  name?: 'asc' | 'desc';
  email?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

export type UserProfileUpdateInput = {
  name?: string;
  email?: string;
}