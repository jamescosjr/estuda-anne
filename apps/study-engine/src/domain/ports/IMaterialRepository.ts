import { Material } from '../entities/Material.js';

export interface IMaterialRepository {
  save(material: Material): Promise<void>;
  findById(id: string): Promise<Material | null>;
  findByStudentId(studentId: string, limit?: number, skip?: number): Promise<Material[]>;
  update(material: Material): Promise<void>;
  delete(id: string): Promise<void>;
  deleteManyByIds(ids: string[]): Promise<void>;
}
