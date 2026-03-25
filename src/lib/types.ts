export interface Document {
  id: string;
  filename: string;
  file_url: string;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
}

export interface Question {
  id: string;
  document_id: string;
  chunk_id: string | null;
  prompt: string;
  choices_json: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'edited';
  created_at: string;
  updated_at: string;
}

export interface ExportManifest {
  version: string;
  generated_at: string;
  document_name: string;
  total_questions: number;
}

export interface ExportQuestion {
  id: string;
  source_document: string;
  chunk_index: number;
  prompt: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ExportPackage {
  manifest: ExportManifest;
  questions: ExportQuestion[];
}

export interface ValidationError {
  questionId: string;
  errors: string[];
}
