import { UserRole } from '../../enums/user.enum';

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: UserRole;
  profilePicture?: string;
  bio?: string;
  isVerified?: boolean;
}
