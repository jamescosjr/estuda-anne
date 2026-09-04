import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/domain/entities/User.js';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/inmemory/InMemoryUserRepository.js';
import { UpdateProfileUseCase } from '../../src/domain/usecases/UpdateProfileUseCase.js';

describe('UpdateProfileUseCase', () => {
  let userRepo: InMemoryUserRepository;
  let useCase: UpdateProfileUseCase;
  let studentUser: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    useCase = new UpdateProfileUseCase(userRepo);

    studentUser = new User({
      id: 'student-123',
      name: 'Estudante Teste',
      email: 'estudante@ufmg.br',
      passwordHash: 'hashedpassword',
      role: 'STUDENT',
      isProfileComplete: false,
    });

    await userRepo.save(studentUser);
  });

  it('deve atualizar o perfil do estudante com curso, período e disciplinas', async () => {
    const updated = await useCase.execute({
      executor: { sub: 'student-123', email: 'estudante@ufmg.br', role: 'STUDENT' },
      name: 'Ana Nogueira',
      course: 'Engenharia de Software',
      period: '3º Período',
      subjects: ['Algoritmos e Estrutura de Dados', 'Cálculo I', 'Engenharia de Software'],
      studyGoalMinutes: 60,
    });

    expect(updated.name).toBe('Ana Nogueira');
    expect(updated.course).toBe('Engenharia de Software');
    expect(updated.period).toBe('3º Período');
    expect(updated.subjects).toEqual(['Algoritmos e Estrutura de Dados', 'Cálculo I', 'Engenharia de Software']);
    expect(updated.studyGoalMinutes).toBe(60);
    expect(updated.isProfileComplete).toBe(true);
  });

  it('deve rejeitar atualização se o token do usuário for inválido', async () => {
    await expect(
      useCase.execute({
        executor: { sub: '', email: '', role: 'STUDENT' },
        course: 'Engenharia',
      })
    ).rejects.toThrow('Acesso negado: token inválido');
  });
});
