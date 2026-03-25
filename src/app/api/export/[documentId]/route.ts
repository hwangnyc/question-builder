import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { validateQuestions } from '@/lib/validate';
import { ExportPackage, Question } from '@/lib/types';

interface DocumentRow {
  id: string;
  filename: string;
  file_path: string;
  uploaded_at: string;
  status: string;
}

interface QuestionWithChunk {
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
  chunk_index: number | null;
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

    const rawQuestions = db.prepare(`
      SELECT q.*, c.chunk_index
      FROM questions q
      LEFT JOIN chunks c ON q.chunk_id = c.id
      WHERE q.document_id = ?
      ORDER BY q.created_at ASC
    `).all(documentId) as QuestionWithChunk[];

    if (rawQuestions.length === 0) {
      return Response.json({ error: 'No questions to export' }, { status: 400 });
    }

    // Parse choices for validation
    const questions: Question[] = rawQuestions.map(q => ({
      ...q,
      choices_json: JSON.parse(q.choices_json),
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      status: q.status as 'draft' | 'edited',
    }));

    // Validate
    const validationErrors = validateQuestions(questions);
    if (validationErrors.length > 0) {
      return Response.json(
        { error: 'Validation failed', validation_errors: validationErrors },
        { status: 422 }
      );
    }

    // Build export package
    const exportPackage: ExportPackage = {
      manifest: {
        version: '1.0',
        generated_at: new Date().toISOString(),
        document_name: doc.filename,
        total_questions: questions.length,
      },
      questions: questions.map((q, i) => ({
        id: q.id,
        source_document: doc.filename,
        chunk_index: rawQuestions[i].chunk_index ?? 0,
        prompt: q.prompt,
        choices: q.choices_json,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    };

    return new Response(JSON.stringify(exportPackage, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${doc.filename.replace('.pdf', '')}_questions.json"`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
