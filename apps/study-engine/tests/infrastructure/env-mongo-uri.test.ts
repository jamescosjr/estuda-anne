import { describe, it, expect } from 'vitest';
import { mongoUriCandidates, rewriteLocalMongoHostForDocker } from '../../src/infrastructure/config/env.js';

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

describe('mongoUriCandidates', () => {
  it('tenta o host Docker antes de localhost', () => {
    expect(mongoUriCandidates('mongodb://localhost:27017/estuda-anne')).toEqual([
      'mongodb://mongodb:27017/estuda-anne',
      'mongodb://localhost:27017/estuda-anne',
    ]);
  });

  it('mantem Atlas na frente e oferece o Mongo do compose como fallback', () => {
    const atlas = 'mongodb+srv://user:pass@cluster.mongodb.net/estuda-anne';
    expect(mongoUriCandidates(atlas)[0]).toBe(atlas);
    expect(mongoUriCandidates(atlas)).toContain('mongodb://mongodb:27017/estuda-anne');
  });
});
