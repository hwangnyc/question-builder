"use client";

import { useEffect, useState, use } from "react";
import { Question, ValidationError } from "@/lib/types";
import Link from "next/link";

export default function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = use(params);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportError, setExportError] = useState<ValidationError[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/questions/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setDocumentName(data.document?.filename || "");
      })
      .catch(console.error);
  }, [documentId]);

  async function handleSave(question: Question) {
    setSaving(true);
    try {
      const res = await fetch(`/api/question/${question.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question.prompt,
          choices_json: question.choices_json,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          difficulty: question.difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      const data = await res.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? data.question : q))
      );
      setEditingId(null);
      setMessage("Question saved.");
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExportError(null);
    try {
      const res = await fetch(`/api/export/${documentId}`);

      if (res.status === 422) {
        const data = await res.json();
        setExportError(data.validation_errors);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      // Download the JSON file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentName.replace(".pdf", "")}_questions.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/documents/${documentId}`} className="text-sm text-blue-600 hover:underline">
            &larr; Back to document
          </Link>
          <h1 className="text-2xl font-bold mt-1">Questions ({questions.length})</h1>
          <p className="text-sm text-gray-500">{documentName}</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
        >
          Export JSON
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
          {message}
        </div>
      )}

      {exportError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          <p className="font-medium mb-2">Export blocked - validation errors:</p>
          <ul className="list-disc pl-5 space-y-1">
            {exportError.map((ve) =>
              ve.errors.map((err, i) => (
                <li key={`${ve.questionId}-${i}`}>
                  Question {ve.questionId.slice(0, 8)}...: {err}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={index}
            isEditing={editingId === q.id}
            onEdit={() => setEditingId(q.id)}
            onCancel={() => setEditingId(null)}
            onSave={handleSave}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  question: Question;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (q: Question) => void;
  saving: boolean;
}) {
  const [editData, setEditData] = useState(question);

  useEffect(() => {
    setEditData(question);
  }, [question]);

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">#{index + 1}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                question.difficulty === "easy" ? "bg-green-100 text-green-700" :
                question.difficulty === "hard" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {question.difficulty}
              </span>
              {question.status === "edited" && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  edited
                </span>
              )}
            </div>
            <p className="font-medium mb-3">{question.prompt}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {question.choices_json.map((choice, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded border ${
                    choice === question.correct_answer
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {choice}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Explanation:</span> {question.explanation}
            </p>
          </div>
          <button
            onClick={onEdit}
            className="ml-4 text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-blue-300 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400">#{index + 1}</span>
        <span className="text-sm font-medium text-blue-600">Editing</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
        <textarea
          value={editData.prompt}
          onChange={(e) => setEditData({ ...editData, prompt: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Choices</label>
        {editData.choices_json.map((choice, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}.</span>
            <input
              value={choice}
              onChange={(e) => {
                const newChoices = [...editData.choices_json];
                newChoices[i] = e.target.value;
                setEditData({ ...editData, choices_json: newChoices });
              }}
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="radio"
                name={`correct-${editData.id}`}
                checked={editData.correct_answer === choice}
                onChange={() => setEditData({ ...editData, correct_answer: choice })}
              />
              Correct
            </label>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
        <textarea
          value={editData.explanation}
          onChange={(e) => setEditData({ ...editData, explanation: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
        <select
          value={editData.difficulty}
          onChange={(e) => setEditData({ ...editData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onSave(editData)}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-md text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
