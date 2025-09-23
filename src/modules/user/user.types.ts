// Types spécifiques au module user

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
}

export interface UserFilter {
  role?: string;
  isActive?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
}
