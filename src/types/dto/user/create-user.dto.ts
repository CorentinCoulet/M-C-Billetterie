import { UserRole } from '../../enums/user.enum';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  profilePicture?: string;
  bio?: string;
}
