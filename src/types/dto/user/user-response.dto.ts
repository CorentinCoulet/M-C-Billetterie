import { UserRole } from '../../enums/user.enum';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  profilePicture?: string;
  bio?: string;
}
