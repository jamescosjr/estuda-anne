import { User } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { IPasswordHasher } from '../ports/IPasswordHasher.js';

export interface SeedAdminDTO {
  adminEmail: string;
  adminPasswordText: string;
  adminName?: string;
}

export class SeedAdminUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async execute(dto: SeedAdminDTO): Promise<User> {
    // 1. Semeia o usuário Admin Master
    let admin = await this.userRepository.findByEmail(dto.adminEmail);
    if (!admin) {
      const passwordHash = await this.passwordHasher.hash(dto.adminPasswordText);
      admin = new User({
        id: 'usr-admin-master',
        name: dto.adminName || 'James (Admin Master)',
        email: dto.adminEmail,
        passwordHash,
        role: 'ADMIN',
      });
      await this.userRepository.save(admin);
    }

    // 2. Semeia as 3 alunas padrão caso não existam ainda
    const defaultStudents = [
      {
        id: 'usr-anne-1',
        name: 'Anne Nogueira',
        email: 'anne@estuda-anne.com',
        course: 'Engenharia de Software',
        period: '5º Semestre',
        subjects: ['Cálculo I', 'Bioquímica', 'Algoritmos e Estruturas de Dados'],
      },
      {
        id: 'usr-mariana-2',
        name: 'Mariana Silva',
        email: 'mariana@estuda-anne.com',
        course: 'Medicina',
        period: '3º Semestre',
        subjects: ['Anatomia Humana', 'Fisiologia', 'Patologia Geral'],
      },
      {
        id: 'usr-carolina-3',
        name: 'Carolina Souza',
        email: 'carolina@estuda-anne.com',
        course: 'Direito',
        period: '7º Semestre',
        subjects: ['Direito Constitucional', 'Direito Civil', 'Processo Penal'],
      },
    ];

    const studentPasswordHash = await this.passwordHasher.hash('EstudaAnne2026!');

    for (const student of defaultStudents) {
      const existing = await this.userRepository.findByEmail(student.email);
      if (!existing) {
        const studentUser = new User({
          id: student.id,
          name: student.name,
          email: student.email,
          passwordHash: studentPasswordHash,
          role: 'STUDENT',
          course: student.course,
          period: student.period,
          subjects: student.subjects,
          isProfileComplete: true,
        });
        await this.userRepository.save(studentUser);
      }
    }

    return admin;
  }
}
