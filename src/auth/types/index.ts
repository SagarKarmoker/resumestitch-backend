export interface JwtPayload {
  sub: string;
  email: string;
  exp?: number;
  iat?: number;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    tier: string;
  };
}