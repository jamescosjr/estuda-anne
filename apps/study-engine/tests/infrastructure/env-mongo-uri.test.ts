import { describe, it, expect } from 'vitest';
import { rewriteLocalMongoHostForDocker } from '../../src/infrastructure/config/env.js';

describe('rewriteLocalMongoHostForDocker', () => {
  it('aponta localhost para o servico mongodb somente dentro do Docker', () => {
    expect(rewriteLocalMongoHostForDocker('mongodb://localhost:27017/estuda-anne', true))
      .toBe('mongodb://mongodb:27017/estuda-anne');
    expect(rewriteLocalMongoHostForDocker('mongodb://localhost:27017/estuda-anne', false))
      .toBe('mongodb://localhost:27017/estuda-anne');
  });

  it('nao altera URI Atlas ou hostname ja dockerizado', () => {
    const atlas = 'mongodb+srv://user:pass@cluster.mongodb.net/estuda-anne';
    expect(rewriteLocalMongoHostForDocker(atlas, true)).toBe(atlas);
    expect(rewriteLocalMongoHostForDocker('mongodb://mongodb:27017/estuda-anne', true))
      .toBe('mongodb://mongodb:27017/estuda-anne');
  });
});
