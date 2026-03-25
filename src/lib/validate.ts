import { Question, ValidationError } from './types';

export function validateQuestions(questions: Question[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const q of questions) {
    const questionErrors: string[] = [];

    if (!q.prompt || q.prompt.trim() === '') {
      questionErrors.push('Question prompt is empty');
    }

    const choices = q.choices_json;
    if (!Array.isArray(choices) || choices.length !== 4) {
      questionErrors.push(`Must have exactly 4 choices (has ${Array.isArray(choices) ? choices.length : 0})`);
    }

    if (Array.isArray(choices)) {
      const uniqueChoices = new Set(choices.map(c => c.trim().toLowerCase()));
      if (uniqueChoices.size !== choices.length) {
        questionErrors.push('Contains duplicate choices');
      }

      if (!choices.includes(q.correct_answer)) {
        questionErrors.push('Correct answer does not match any choice');
      }
    }

    if (!q.explanation || q.explanation.trim() === '') {
      questionErrors.push('Explanation is missing');
    }

    if (questionErrors.length > 0) {
      errors.push({ questionId: q.id, errors: questionErrors });
    }
  }

  return errors;
}
