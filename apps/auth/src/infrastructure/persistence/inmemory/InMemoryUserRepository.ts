import { User } from '../../../domain/entities/User.js';
import { IUserRepository, PaginatedStudentsResult } from '../../../domain/ports/IUserRepository.js';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find((u) => u.email === normalized);
    return user || null;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async update(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  public async findAllStudents(): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.role === 'STUDENT');
  }

  public async findStudentsPaginated(query: { search?: string; page: number; limit: number }): Promise<PaginatedStudentsResult> {
    const allStudents = Array.from(this.users.values()).filter((u) => u.role === 'STUDENT');
    let filtered = allStudents;

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.toLowerCase().trim();
      filtered = allStudents.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    }

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const start = (page - 1) * limit;
    const students = filtered.slice(start, start + limit);

    return {
      students,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
