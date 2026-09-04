import { describe, it, expect, beforeEach } from 'vitest';
import { User, TokenPayload, IUserRepository, IPasswordHasher, ITokenProvider } from '../../src/domain/index.js';
import { AuthenticateUserUseCase } from '../../src/domain/usecases/AuthenticateUserUseCase.js';
import { CreateStudentUserUseCase } from '../../src/domain/usecases/CreateStudentUserUseCase.js';
import { UpdateStudentUserUseCase } from '../../src/domain/usecases/UpdateStudentUserUseCase.js';
import { DeleteStudentUserUseCase } from '../../src/domain/usecases/DeleteStudentUserUseCase.js';
import { SeedAdminUserUseCase } from '../../src/domain/usecases/SeedAdminUserUseCase.js';

class InMemoryUserRepository implements IUserRepository {
  public users: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(u => u.email === email.toLowerCase().trim());
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  async findAllStudents(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === 'STUDENT');
  }

  async findStudentsPaginated(query: { search?: string; page: number; limit: number }) {
    const all = Array.from(this.users.values()).filter(u => u.role === 'STUDENT');
    let filtered = all;

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.toLowerCase().trim();
      filtered = all.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    }

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const start = (page - 1) * limit;
    const students = filtered.slice(start, start + limit);

    return { students, total, page, limit, totalPages };
  }
}

class FakePasswordHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    return `hashed_${plainText}`;
  }
  async compare(plainText: string, hash: string): Promise<boolean> {
    return hash === `hashed_${plainText}`;
  }
}

class FakeTokenProvider implements ITokenProvider {
  generateToken(payload: TokenPayload): string {
    return `token_${payload.userId}_${payload.role}`;
  }
  verifyToken(token: string): TokenPayload {
    const parts = token.split('_');
    return {
      userId: parts[1] || 'mock-id',
      email: 'mock@test.com',
      role: (parts[2] as any) || 'STUDENT',
    };
  }
}

describe('Domínio de Autenticação e Usuários (Estuda Anne)', () => {
  let userRepo: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let tokenProvider: FakeTokenProvider;
  let adminExecutor: TokenPayload;
  let studentExecutor: TokenPayload;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokenProvider = new FakeTokenProvider();

    adminExecutor = {
      userId: 'usr-admin-1',
      email: 'admin@estuda-anne.com',
      role: 'ADMIN',
    };

    studentExecutor = {
      userId: 'usr-student-1',
      email: 'anne@universidade.edu',
      role: 'STUDENT',
    };
  });

  describe('Entidade User', () => {
    it('deve criar uma entidade User com papel ADMIN', () => {
      const user = new User({
        name: 'James Admin',
        email: 'james@estuda-anne.com',
        passwordHash: 'hashed_password',
        role: 'ADMIN',
      });

      expect(user.isAdmin()).toBe(true);
      expect(user.isStudent()).toBe(false);
      expect(user.email).toBe('james@estuda-anne.com');
    });

    it('deve lançar erro se o e-mail for inválido', () => {
      expect(() => {
        new User({
          name: 'Anne',
          email: 'email_invalido',
          passwordHash: 'hash',
          role: 'STUDENT',
        });
      }).toThrow('E-mail do usuário é inválido');
    });
  });

  describe('SeedAdminUserUseCase', () => {
    it('deve semear o usuário Admin inicial se ele ainda não existir', async () => {
      const seedUseCase = new SeedAdminUserUseCase(userRepo, hasher);
      const admin = await seedUseCase.execute({
        adminEmail: 'james@estuda-anne.com',
        adminPasswordText: 'AdminPassword123!',
      });

      expect(admin.email).toBe('james@estuda-anne.com');
      expect(admin.role).toBe('ADMIN');
      expect(admin.passwordHash).toBe('hashed_AdminPassword123!');
    });
  });

  describe('CreateStudentUserUseCase', () => {
    it('deve permitir que o usuário ADMIN crie um novo estudante', async () => {
      const createUseCase = new CreateStudentUserUseCase(userRepo, hasher);

      const student = await createUseCase.execute({
        executor: adminExecutor,
        name: 'Anne Student',
        email: 'anne@universidade.edu.br',
        passwordText: 'AnnePass2026!',
      });

      expect(student.role).toBe('STUDENT');
      expect(student.email).toBe('anne@universidade.edu.br');
      expect(await userRepo.findByEmail('anne@universidade.edu.br')).not.toBeNull();
    });

    it('DEVE BLOQUEAR a criação de estudante se o executor for um STUDENT', async () => {
      const createUseCase = new CreateStudentUserUseCase(userRepo, hasher);

      await expect(
        createUseCase.execute({
          executor: studentExecutor,
          name: 'Tentativa Invasora',
          email: 'hacker@teste.com',
          passwordText: '123456',
        })
      ).rejects.toThrow('Acesso negado: apenas o usuário Admin pode criar novos estudantes');
    });
  });

  describe('AuthenticateUserUseCase', () => {
    it('deve autenticar o usuário e retornar o token JWT', async () => {
      const seedUseCase = new SeedAdminUserUseCase(userRepo, hasher);
      await seedUseCase.execute({
        adminEmail: 'james@estuda-anne.com',
        adminPasswordText: 'SecretAdmin123!',
      });

      const authUseCase = new AuthenticateUserUseCase(userRepo, hasher, tokenProvider);
      const result = await authUseCase.execute({
        email: 'james@estuda-anne.com',
        passwordText: 'SecretAdmin123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.role).toBe('ADMIN');
    });
  });

  describe('DeleteStudentUserUseCase', () => {
    it('deve permitir que o Admin exclua um estudante', async () => {
      const createUseCase = new CreateStudentUserUseCase(userRepo, hasher);
      const student = await createUseCase.execute({
        executor: adminExecutor,
        name: 'Estudante Para Deletar',
        email: 'deletar@teste.com',
        passwordText: '123456',
      });

      const deleteUseCase = new DeleteStudentUserUseCase(userRepo);
      await deleteUseCase.execute({
        executor: adminExecutor,
        studentId: student.id,
      });

      expect(await userRepo.findById(student.id)).toBeNull();
    });

    it('DEVE BLOQUEAR a exclusão se o executor for um STUDENT', async () => {
      const deleteUseCase = new DeleteStudentUserUseCase(userRepo);

      await expect(
        deleteUseCase.execute({
          executor: studentExecutor,
          studentId: 'qualquer-id',
        })
      ).rejects.toThrow('Acesso negado: apenas o usuário Admin pode remover estudantes');
    });
  });

  describe('UpdateStudentUserUseCase', () => {
    it('deve permitir que o Admin atualize nome e e-mail de um estudante', async () => {
      const createUseCase = new CreateStudentUserUseCase(userRepo, hasher);
      const student = await createUseCase.execute({
        executor: adminExecutor,
        name: 'Anne Original',
        email: 'original@teste.com',
        passwordText: '123456',
      });

      const updateUseCase = new UpdateStudentUserUseCase(userRepo, hasher);
      const updated = await updateUseCase.execute({
        executor: adminExecutor,
        studentId: student.id,
        name: 'Anne Editada',
        email: 'editada@teste.com',
      });

      expect(updated.name).toBe('Anne Editada');
      expect(updated.email).toBe('editada@teste.com');
    });
  });

  describe('Busca Paginada de Estudantes', () => {
    it('deve filtrar estudantes por termo de busca e paginar os resultados', async () => {
      const createUseCase = new CreateStudentUserUseCase(userRepo, hasher);
      await createUseCase.execute({ executor: adminExecutor, name: 'Alice Silva', email: 'alice@teste.com', passwordText: '123456' });
      await createUseCase.execute({ executor: adminExecutor, name: 'Bob Souza', email: 'bob@teste.com', passwordText: '123456' });
      await createUseCase.execute({ executor: adminExecutor, name: 'Carol Silva', email: 'carol@teste.com', passwordText: '123456' });

      const res1 = await userRepo.findStudentsPaginated({ search: 'Silva', page: 1, limit: 1 });
      expect(res1.total).toBe(2);
      expect(res1.totalPages).toBe(2);
      expect(res1.students.length).toBe(1);

      const resAll = await userRepo.findStudentsPaginated({ search: '', page: 1, limit: 10 });
      expect(resAll.total).toBe(3);
    });
  });
});
