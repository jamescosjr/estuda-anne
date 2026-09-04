import { UserRole } from '../entities/User.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sub?: string;
}

export interface ITokenProvider {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload;
}
