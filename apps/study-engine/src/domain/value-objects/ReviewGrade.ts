/**
 * Escala de avaliação do algoritmo SuperMemo (SM-2):
 * 0: Blackout completo (não lembrou nada)
 * 1: Resposta incorreta, mas lembrou ao ver a resposta
 * 2: Resposta incorreta, mas parecia fácil/familiar
 * 3: Resposta correta com dificuldade significativa
 * 4: Resposta correta após hesitação
 * 5: Resposta perfeita e imediata
 */
export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export function isValidReviewGrade(value: number): value is ReviewGrade {
  return Number.isInteger(value) && value >= 0 && value <= 5;
}
