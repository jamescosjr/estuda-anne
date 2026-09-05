import { Db } from 'mongodb';
import { User, UserRole } from '../../../../domain/entities/User.js';
import { IUserRepository, PaginatedStudentsResult } from '../../../../domain/ports/IUserRepository.js';

interface MongoUserDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  course?: string;
  period?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  examDates?: Array<{ id: string; subject: string; title: string; date: string }>;
  subjects?: string[];
  studyGoalMinutes?: number;
  isProfileComplete?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoUserRepository implements IUserRepository {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<MongoUserDoc>('users');
  }

  public async findByEmail(email: string): Promise<User | null> {
    const doc = await this.collection().findOne({ email: email.toLowerCase().trim() });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  public async findById(id: string): Promise<User | null> {
    const doc = await this.collection().findOne({ _id: id });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  public async save(user: User): Promise<void> {
    const doc: MongoUserDoc = {
      _id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      course: user.course,
      period: user.period,
      periodStartDate: user.periodStartDate,
      periodEndDate: user.periodEndDate,
      examDates: user.examDates,
      subjects: user.subjects,
      studyGoalMinutes: user.studyGoalMinutes,
      isProfileComplete: user.isProfileComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    await this.collection().updateOne(
      { _id: user.id },
      { $set: doc },
      { upsert: true }
    );
  }

  public async update(user: User): Promise<void> {
    await this.save(user);
  }

  public async delete(id: string): Promise<void> {
    await this.collection().deleteOne({ _id: id });
  }

  public async findAllStudents(): Promise<User[]> {
    const docs = await this.collection().find({ role: 'STUDENT' }).toArray();
    return docs.map(doc => this.toDomain(doc));
  }

  public async findStudentsPaginated(query: { search?: string; page: number; limit: number }): Promise<PaginatedStudentsResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));

    const filter: Record<string, any> = { role: 'STUDENT' };

    if (query.search && query.search.trim().length > 0) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const total = await this.collection().countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const docs = await this.collection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return {
      students: docs.map(doc => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  private toDomain(doc: MongoUserDoc): User {
    return new User({
      id: doc._id,
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      course: doc.course,
      period: doc.period,
      periodStartDate: doc.periodStartDate,
      periodEndDate: doc.periodEndDate,
      examDates: doc.examDates,
      subjects: doc.subjects,
      studyGoalMinutes: doc.studyGoalMinutes,
      isProfileComplete: doc.isProfileComplete,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
