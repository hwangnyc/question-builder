import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { readFile } from '@/lib/storage';
import { chunkText } from '@/lib/chunker';
import { generateQuestions } from '@/lib/ai';
import { PDFParse } from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300;

interface DocumentRow {
  id: string;
  filename: string;
  file_path: string;
  notes: string;
  uploaded_at: string;
  status: string;
}

export async function POST(
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

    // Mark as processing
    db.prepare("UPDATE documents SET status = 'processing' WHERE id = ?").run(documentId);

    try {
      // Read PDF from local storage
      const pdfBuffer = readFile(doc.file_path);

      // Extract text
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      const fullText: string = textResult.text;

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text could be extracted from PDF');
      }

      // Chunk text
      const chunks = chunkText(fullText);

      // Store chunks
      const insertChunk = db.prepare(
        'INSERT INTO chunks (id, document_id, chunk_index, chunk_text) VALUES (?, ?, ?, ?)'
      );

      const chunkIds: { id: string; index: number }[] = [];
      const insertChunks = db.transaction(() => {
        for (let i = 0; i < chunks.length; i++) {
          const chunkId = uuidv4();
          insertChunk.run(chunkId, documentId, i, chunks[i]);
          chunkIds.push({ id: chunkId, index: i });
        }
      });
      insertChunks();

      // Generate questions for each chunk
      let totalQuestions = 0;
      const errors: string[] = [];

      const insertQuestion = db.prepare(
        `INSERT INTO questions (id, document_id, chunk_id, prompt, choices_json, correct_answer, explanation, difficulty, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      );

      for (let i = 0; i < chunkIds.length; i++) {
        const chunk = chunkIds[i];
        try {
          const questions = await generateQuestions(chunks[i], doc.notes || '');

          if (questions.length > 0) {
            const insertBatch = db.transaction(() => {
              for (const q of questions) {
                insertQuestion.run(
                  uuidv4(),
                  documentId,
                  chunk.id,
                  q.prompt,
                  JSON.stringify(q.choices),
                  q.correct_answer,
                  q.explanation,
                  q.difficulty || 'medium'
                );
              }
            });
            insertBatch();
            totalQuestions += questions.length;
          }
        } catch (aiError) {
          const msg = aiError instanceof Error ? aiError.message : 'Unknown error';
          console.error(`Chunk ${i} AI error:`, msg);
          errors.push(`Chunk ${i}: ${msg}`);
        }
      }

      // Mark as processed
      db.prepare("UPDATE documents SET status = 'processed' WHERE id = ?").run(documentId);

      return Response.json({
        success: true,
        chunks: chunkIds.length,
        questions: totalQuestions,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (processingError) {
      db.prepare("UPDATE documents SET status = 'failed' WHERE id = ?").run(documentId);
      throw processingError;
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
