import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Sensor de Arquitetura — Enforced-by ADR-0001 (Domain Puro)
 * Garante que a camada de domínio permaneça 100% isolada e independente.
 */
describe('Arquitetura DDD Linear (enforced-by: docs/adr/0001-ddd-linear.md)', () => {
  const domainDir = path.resolve(__dirname, '../../src/domain');

  function getAllTsFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllTsFiles(fullPath));
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const domainFiles = getAllTsFiles(domainDir);

  it('ADR-0001: src/domain não depende de application nem de infrastructure', () => {
    const violations: { file: string; forbiddenImport: string }[] = [];

    // Padrões de import proibidos dentro do Domain
    const forbiddenPatterns = [
      /from\s+['"].*\/application(\/.*)?['"]/,
      /from\s+['"].*\/infrastructure(\/.*)?['"]/,
      /from\s+['"]fastify['"]/,
      /from\s+['"]mongodb['"]/,
      /from\s+['"]@aws-sdk.*['"]/,
    ];

    for (const filePath of domainFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(line)) {
            const relPath = path.relative(path.resolve(__dirname, '../..'), filePath);
            violations.push({
              file: `${relPath}:${index + 1}`,
              forbiddenImport: line.trim(),
            });
          }
        }
      });
    }

    const message = violations
      .map(
        (v) =>
          `\n- ${v.file}: "${v.forbiddenImport}"\n  -> Violação de ADR-0001: src/domain não pode importar de application, infrastructure ou I/O externo. Defina uma porta em src/domain/ports/ e implemente em infrastructure.`
      )
      .join('');

    expect(violations, message).toEqual([]);
  });
});
