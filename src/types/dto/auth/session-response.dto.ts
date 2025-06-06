export interface SessionResponseDto {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}