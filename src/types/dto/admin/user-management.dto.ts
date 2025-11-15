import { UserRole } from '../../enums/user.enum';

export interface UserManagementDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  isBlocked: boolean;
}

export interface UpdateUserRoleDto {
  userId: string;
  role: UserRole;
}

export interface BlockUserDto {
  userId: string;
  reason: string;
}

export interface UnblockUserDto {
  userId: string;
}