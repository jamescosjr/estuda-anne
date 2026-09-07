import { describe, it, expect } from 'vitest';
import { QualityGateAgent } from '../../src/domain/services/pedagogical-agents/QualityGateAgent.js';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';
import { Quiz } from '../../src/domain/entities/Quiz.js';

describe('QualityGateAgent — Controle de Qualidade e Deduplicação', () => {
  const qualityGate = new QualityGateAgent();

  it('deve aprovar lote com flashcards e quiz sem repetições', () => {
    const flashcards = [
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é derivada?', back: 'Taxa de variação' }),
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é integral?', back: 'Área sob a curva' }),
    ];

    const quiz = Quiz.create({
      studentId: 'usr-1',
      materialId: 'mat-1',
      title: 'Quiz de Cálculo',
      questions: [
        {
          prompt: 'Qual a derivada de x²?',
          options: ['2x', 'x', '2', '0'],
          correctAnswerIndex: 0,
          explanation: 'Regra do tombo',
        },
        {
          prompt: 'Qual a integral de 1/x?',
          options: ['ln|x|', '1', 'x²', '0'],
          correctAnswerIndex: 0,
          explanation: 'Integral do logaritmo natural',
        },
      ],
    });

    const result = qualityGate.evaluateQuality(
      'Resumo conciso de cálculo',
      ['derivada', 'integral'],
      flashcards,
      quiz
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('deve reprovar quando houver flashcards duplicados', () => {
    const flashcards = [
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é derivada?', back: 'A taxa de variação instantânea de uma função matemática.' }),
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é derivada?', back: 'Outra resposta sobre taxa de variação.' }),
    ];

    const result = qualityGate.evaluateQuality(
      'Resumo conciso',
      ['derivada'],
      flashcards,
      null
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Flashcards duplicados');
  });

  it('deve reprovar quando houver perguntas duplicadas no quiz', () => {
    const flashcards = [
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é derivada?', back: 'Taxa de variação' }),
    ];

    const quiz = Quiz.create({
      studentId: 'usr-1',
      materialId: 'mat-1',
      title: 'Quiz',
      questions: [
        {
          prompt: 'Qual a derivada de x²?',
          options: ['2x', 'x', '2', '0'],
          correctAnswerIndex: 0,
          explanation: 'Explicacao 1',
        },
        {
          prompt: 'Qual a derivada de x²?',
          options: ['a', 'b', 'c', 'd'],
          correctAnswerIndex: 0,
          explanation: 'Explicacao 2',
        },
      ],
    });

    const result = qualityGate.evaluateQuality(
      'Resumo conciso',
      ['derivada'],
      flashcards,
      quiz
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Perguntas duplicadas');
  });

  it('deve reprovar se uma questão tiver opções duplicadas', () => {
    const flashcards = [
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é derivada?', back: 'Taxa de variação' }),
    ];

    const quiz = Quiz.create({
      studentId: 'usr-1',
      materialId: 'mat-1',
      title: 'Quiz',
      questions: [
        {
          prompt: 'Qual a derivada de x²?',
          options: ['2x', '2x', '2', '0'],
          correctAnswerIndex: 0,
          explanation: 'Opção 2x repetida',
        },
      ],
    });

    const result = qualityGate.evaluateQuality(
      'Resumo conciso',
      ['derivada'],
      flashcards,
      quiz
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Opções duplicadas');
  });

  it('deve reprovar perguntas sobre metadados, datas de arquivo ou a aluna Anne', () => {
    const flashcards = [
      Flashcard.create({ studentId: 'usr-1', materialId: 'mat-1', front: 'O que é um LLM em inteligência artificial?', back: 'Modelo de linguagem de grande escala treinado com dados de texto' }),
    ];

    const quiz = Quiz.create({
      studentId: 'usr-1',
      materialId: 'mat-1',
      title: 'Quiz',
      questions: [
        {
          prompt: 'Qual é o autor do PDF segundo os metadados do arquivo?',
          options: ['Jane', 'John', 'Anne', 'Ninguém'],
          correctAnswerIndex: 0,
          explanation: 'Metadado',
        },
      ],
    });

    const result = qualityGate.evaluateQuality(
      'Resumo de LLMs',
      ['llm'],
      flashcards,
      quiz
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/fora do conteúdo/i);
  });

  it('deve reprovar flashcards que mencionam estrutura do PDF, páginas ou itens de documento', () => {
    const flashcards = [
      Flashcard.create({
        studentId: 'usr-1',
        materialId: 'mat-1',
        front: 'Segundo o item 3 do PDF, qual a definição de ATP?',
        back: 'Molécula responsável pelo armazenamento de energia celular',
      }),
    ];

    const result = qualityGate.evaluateQuality(
      'Resumo de Bioquímica',
      ['atp'],
      flashcards,
      null
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/referências a formato de documento ou PDF/i);
  });

  it('deve reprovar flashcards com alta similaridade semântica entre si', () => {
    const flashcards = [
      Flashcard.create({
        studentId: 'usr-1',
        materialId: 'mat-1',
        front: 'Qual a função principal da mitocôndria na célula eucariótica?',
        back: 'Produção de ATP através da respiração celular',
      }),
      Flashcard.create({
        studentId: 'usr-1',
        materialId: 'mat-1',
        front: 'Qual é a função da mitocôndria dentro da célula eucariótica?',
        back: 'Gerar energia para a célula na forma de ATP',
      }),
    ];

    const result = qualityGate.evaluateQuality(
      'Resumo de Biologia Celular',
      ['mitocôndria'],
      flashcards,
      null
    );

    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/duplicados ou repetidos/i);
  });
});
