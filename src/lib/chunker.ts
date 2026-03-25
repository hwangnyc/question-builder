/**
 * Splits text into chunks of ~300-800 words without breaking mid-sentence.
 */
export function chunkText(text: string): string[] {
  const cleaned = cleanText(text);
  const sentences = splitIntoSentences(cleaned);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.split(/\s+/).length;

    // If adding this sentence would exceed 800 words and we already have 300+, start new chunk
    if (currentWordCount + sentenceWordCount > 800 && currentWordCount >= 300) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ' ';
      currentWordCount = sentenceWordCount;
    } else {
      currentChunk += sentence + ' ';
      currentWordCount += sentenceWordCount;
    }
  }

  // Push remaining text
  if (currentChunk.trim()) {
    // If last chunk is too small, merge with previous
    if (currentWordCount < 100 && chunks.length > 0) {
      chunks[chunks.length - 1] += ' ' + currentChunk.trim();
    } else {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

function cleanText(text: string): string {
  let cleaned = text;
  // Remove page numbers (standalone numbers on their own line)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  // Remove common headers/footers patterns
  cleaned = cleaned.replace(/^(page\s+\d+|confidential|draft).*$/gim, '');
  // Collapse multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  return cleaned.trim();
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.filter(s => s.trim().length > 0);
}
