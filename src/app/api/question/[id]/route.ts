import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

interface QuestionRow {
  id: string;
  document_id: string;
  chunk_id: string | null;
  prompt: string;
  choices_json: string;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { prompt, choices_json, correct_answer, explanation, difficulty } = body;

    const db = getDb();

    const fields: string[] = ["status = 'edited'", "updated_at = datetime('now')"];
    const values: unknown[] = [];

    if (prompt !== undefined) { fields.push('prompt = ?'); values.push(prompt); }
    if (choices_json !== undefined) { fields.push('choices_json = ?'); values.push(JSON.stringify(choices_json)); }
    if (correct_answer !== undefined) { fields.push('correct_answer = ?'); values.push(correct_answer); }
    if (explanation !== undefined) { fields.push('explanation = ?'); values.push(explanation); }
    if (difficulty !== undefined) { fields.push('difficulty = ?'); values.push(difficulty); }

    values.push(id);

    const result = db.prepare(
      `UPDATE questions SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    if (result.changes === 0) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }

    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow;
    const question = { ...row, choices_json: JSON.parse(row.choices_json) };

    return Response.json({ question });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
