"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Document } from "@/lib/types";

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<Document | null>(null);
  const [chunksCount, setChunksCount] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/questions/${id}`);
      const data = await res.json();
      if (res.ok) {
        setDoc(data.document);
        setChunksCount(data.chunks_count);
        setQuestionsCount(data.questions?.length || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  async function handleProcess() {
    setProcessing(true);
    setProcessResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/process/${id}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }

      setProcessResult(
        `Done! ${data.chunks} chunks created, ${data.questions} questions generated.` +
        (data.errors ? ` (${data.errors.length} warnings)` : "")
      );

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  }

  if (!doc) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{doc.filename}</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <span className="font-medium capitalize">{doc.status}</span>
          </div>
          <div>
            <span className="text-gray-500">Uploaded:</span>{" "}
            <span className="font-medium">{new Date(doc.uploaded_at).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Chunks:</span>{" "}
            <span className="font-medium">{chunksCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Questions:</span>{" "}
            <span className="font-medium">{questionsCount}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {(doc.status === "uploaded" || doc.status === "failed") && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {processing ? "Processing..." : doc.status === "failed" ? "Retry Processing" : "Process Document"}
          </button>
        )}

        {questionsCount > 0 && (
          <>
            <Link
              href={`/documents/${id}/questions`}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
            >
              View Questions ({questionsCount})
            </Link>
            <a
              href={`/api/export/${id}`}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
            >
              Export JSON
            </a>
          </>
        )}
      </div>

      {processResult && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {processResult}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
