import jwt from 'jsonwebtoken';
import { ITokenProvider, TokenPayload } from '../../domain/ports/ITokenProvider.js';
import { env } from '../config/env.js';

export class JwtTokenProvider implements ITokenProvider {
  private readonly secret: string;

  constructor(secret: string = env.JWT_SECRET) {
    this.secret = secret;
  }

  public generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '7d' });
  }

  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        const expiredErr = new Error('Token expirado');
        expiredErr.name = 'TokenExpiredError';
        throw expiredErr;
      }
      const invalidErr = new Error('Token inválido ou expirado');
      invalidErr.name = err?.name || 'JsonWebTokenError';
      throw invalidErr;
    }
  }
}
