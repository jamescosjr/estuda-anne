export type UserRole = 'ADMIN' | 'STUDENT';

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  course?: string;
  period?: string;
  subjects?: string[];
  studyGoalMinutes?: number;
  isProfileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private readonly _id: string;
  private _name: string;
  private _email: string;
  private _passwordHash: string;
  private readonly _role: UserRole;
  private _course?: string;
  private _period?: string;
  private _subjects: string[];
  private _studyGoalMinutes?: number;
  private _isProfileComplete: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Nome do usuário é obrigatório');
    }
    if (!props.email || !props.email.includes('@')) {
      throw new Error('E-mail do usuário é inválido');
    }
    if (!props.passwordHash) {
      throw new Error('Hash da senha é obrigatório');
    }

    this._id = props.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this._name = props.name.trim();
    this._email = props.email.toLowerCase().trim();
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._course = props.course?.trim();
    this._period = props.period?.trim();
    this._subjects = props.subjects || [];
    this._studyGoalMinutes = props.studyGoalMinutes || 45;
    this._isProfileComplete = props.isProfileComplete ?? (props.role === 'ADMIN' || Boolean(props.course && props.period));
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get email(): string {
    return this._email;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get role(): UserRole {
    return this._role;
  }

  public get course(): string | undefined {
    return this._course;
  }

  public get period(): string | undefined {
    return this._period;
  }

  public get subjects(): string[] {
    return this._subjects;
  }

  public get studyGoalMinutes(): number | undefined {
    return this._studyGoalMinutes;
  }

  public get isProfileComplete(): boolean {
    return this._isProfileComplete;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public isAdmin(): boolean {
    return this._role === 'ADMIN';
  }

  public isStudent(): boolean {
    return this._role === 'STUDENT';
  }

  public updateDetails(name?: string, email?: string): void {
    if (name) {
      if (name.trim().length === 0) throw new Error('Nome não pode ser vazio');
      this._name = name.trim();
    }
    if (email) {
      if (!email.includes('@')) throw new Error('E-mail inválido');
      this._email = email.toLowerCase().trim();
    }
    this._updatedAt = new Date();
  }

  public updateProfile(data: {
    name?: string;
    course?: string;
    period?: string;
    subjects?: string[];
    studyGoalMinutes?: number;
  }): void {
    if (data.name) {
      if (data.name.trim().length === 0) throw new Error('Nome não pode ser vazio');
      this._name = data.name.trim();
    }
    if (data.course !== undefined) {
      this._course = data.course.trim();
    }
    if (data.period !== undefined) {
      this._period = data.period.trim();
    }
    if (data.subjects !== undefined) {
      this._subjects = data.subjects.map((s) => s.trim()).filter(Boolean);
    }
    if (data.studyGoalMinutes !== undefined) {
      this._studyGoalMinutes = data.studyGoalMinutes;
    }
    this._isProfileComplete = Boolean(this._course && this._period);
    this._updatedAt = new Date();
  }

  public updatePassword(newPasswordHash: string): void {
    if (!newPasswordHash) throw new Error('Novo hash de senha inválido');
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id,
      name: this._name,
      email: this._email,
      role: this._role,
      course: this._course,
      period: this._period,
      subjects: this._subjects,
      studyGoalMinutes: this._studyGoalMinutes,
      isProfileComplete: this._isProfileComplete,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
