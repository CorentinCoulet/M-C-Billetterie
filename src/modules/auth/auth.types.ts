// Types spécifiques au module auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role?: string;
    sessionId?: string;
  };
  token: string;
}

export interface AuthError {
  code: string;
  message: string;
}
