import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { saveFile } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const notes = (formData.get('notes') as string) || '';

    const fileId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = saveFile(fileId, file.name, buffer);

    const db = getDb();
    db.prepare(
      `INSERT INTO documents (id, filename, file_path, notes, status) VALUES (?, ?, ?, ?, 'uploaded')`
    ).run(fileId, file.name, filePath, notes);

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(fileId);

    return Response.json({ document: doc }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
