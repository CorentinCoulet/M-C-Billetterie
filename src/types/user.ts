import { Role } from '@prisma/client';

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
  role: Role;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  blockedUser: BlockedUserBasic | null;
}

export type UserCreateInput = {
  name?: string | null;
  email: string;
  password?: string | null;
  role?: Role;
  phone?: string | null;
  address?: string | null;
}

export type UserUpdateInput = {
  name?: string | null;
  email?: string;
  password?: string | null;
  role?: Role;
  phone?: string | null;
  address?: string | null;
}

export type UserWhereInput = {
  id?: string;
  email?: string;
  name?: {
    contains?: string;
    mode?: 'insensitive';
  };
  role?: Role;
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
  phone?: string;
  address?: string;
}