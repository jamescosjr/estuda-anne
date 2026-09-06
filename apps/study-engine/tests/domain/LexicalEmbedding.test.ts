import { describe, it, expect } from 'vitest';
import { cosineSimilarity, lexicalEmbedding } from '../../src/domain/services/LexicalEmbedding.js';

describe('LexicalEmbedding', () => {
  it('aproxima documentos com vocabulario parecido', () => {
    const a = lexicalEmbedding('cidadania dignidade republica fundamentos');
    const b = lexicalEmbedding('fundamentos da cidadania e dignidade');
    const c = lexicalEmbedding('algoritmos grafos complexidade heap');
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));
  });
});
