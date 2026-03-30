import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const documents = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all();
    return Response.json({ documents });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
