import { IUserRepository } from '../ports/IUserRepository.js';
import { IPasswordHasher } from '../ports/IPasswordHasher.js';
import { ITokenProvider } from '../ports/ITokenProvider.js';
import { User } from '../entities/User.js';

export interface AuthenticateUserDTO {
  email: string;
  passwordText: string;
}

export interface AuthenticateUserResponse {
  token: string;
  user: ReturnType<User['toJSON']>;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider
  ) {}

  public async execute(dto: AuthenticateUserDTO): Promise<AuthenticateUserResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Credenciais inválidas: usuário não encontrado');
    }

    const isValidPassword = await this.passwordHasher.compare(dto.passwordText, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas: senha incorreta');
    }

    const token = this.tokenProvider.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: user.toJSON(),
    };
  }
}
