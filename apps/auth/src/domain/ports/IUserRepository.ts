import { User } from '../entities/User.js';

export interface PaginatedStudentsResult {
  students: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  findAllStudents(): Promise<User[]>;
  findStudentsPaginated(query: { search?: string; page: number; limit: number }): Promise<PaginatedStudentsResult>;
}

