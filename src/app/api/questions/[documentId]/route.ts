import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

interface DocumentRow {
  id: string;
  filename: string;
  file_path: string;
  uploaded_at: string;
  status: string;
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  try {
    const db = getDb();

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId) as DocumentRow | undefined;
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const chunksCount = db.prepare(
      'SELECT COUNT(*) as count FROM chunks WHERE document_id = ?'
    ).get(documentId) as { count: number };

    const rawQuestions = db.prepare(
      'SELECT * FROM questions WHERE document_id = ? ORDER BY created_at ASC'
    ).all(documentId) as QuestionRow[];

    // Parse choices_json from string to array
    const questions = rawQuestions.map(q => ({
      ...q,
      choices_json: JSON.parse(q.choices_json),
    }));

    return Response.json({
      document: doc,
      chunks_count: chunksCount.count,
      questions,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
