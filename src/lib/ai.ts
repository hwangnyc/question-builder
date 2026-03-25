interface GeneratedQuestion {
  prompt: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function generateQuestions(chunkText: string, notes: string = ''): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || 'https://api.anthropic.com/v1/messages';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const systemPrompt = `You are an NYPD police promotional exam question writer. You create realistic, challenging scenario-based multiple-choice questions that mirror actual NYPD promotional exams. You must respond with valid JSON only - no markdown, no code fences, just the JSON array.`;

  const notesSection = notes ? `\nADMIN FOCUS NOTES:\n${notes}\nUse these notes to guide which aspects of the source text to emphasize when creating questions.\n` : '';

  const userPrompt = `Source Text:
${chunkText}
${notesSection}
RANK AND TITLE RULES — MANDATORY:
- If the procedure assigns a task to a "desk officer" or "patrol supervisor", the character in your scenario MUST hold the rank of Sergeant or Lieutenant (e.g., "Sgt. Rivera", "Lt. Park"). Never use "PO" or "Officer" for these roles.
- If the procedure references an "operations coordinator", the character MUST be a Lieutenant.
- Match the rank to the role as defined in the procedure. Do not assign tasks to ranks that the procedure does not authorize.

LANGUAGE RULES — MANDATORY:
- Questions must ask what is "MOST appropriate", never "MOST correct"
- NEVER use the word "text" when referring to the source material. Use "procedure", "manual", or "guide" instead.

STRICT GROUNDING RULES — VIOLATIONS WILL CAUSE REJECTION:
- You may ONLY reference procedure numbers, section numbers, rules, and requirements that appear VERBATIM in the source text above
- Do NOT invent or hallucinate ANY procedure numbers, section numbers, patrol guide references, or legal citations
- Do NOT reference any knowledge outside the source text — if it's not in the text, it does not exist for this task
- Every fact, rule, and requirement in your questions and answers MUST be directly traceable to a specific sentence in the source text
- If the source text mentions "Section 212-37", you may reference it. If it does NOT mention a section number, do NOT make one up
- The explanation for each answer MUST quote or closely paraphrase the specific part of the source text that supports the correct answer

TIME RULES — MANDATORY:
- When scenarios mention a tour start time or time of day, ONLY use official NYPD tour start times: 0700, 1500, or 2300
- Do NOT use random times. All tour references must use one of these three times.

QUESTION STYLE — THIS IS CRITICAL:
- 80% of questions MUST be LONG scenario-based questions (4-6 sentences). Create a realistic NYPD scenario with:
  - A named officer (use realistic names like "PO Martinez", "Sgt. O'Brien", "Officer Chen")
  - A specific location (use real NYC street names, precincts, boroughs)
  - A detailed situation with complicating factors (witnesses who don't speak English, multiple violations at once, conflicting priorities, time pressure, ambiguous circumstances)
  - Reference ONLY procedure/section numbers that appear in the source text
  - Use NYPD tour start times (0700, 1500, 2300) when time is relevant to the scenario
  - End with a question like: "It would be MOST appropriate for [Officer Name] to:"
- 20% of questions can be shorter direct knowledge questions, but still challenging

ANSWER CHOICES — THIS IS CRITICAL:
- All 4 choices must sound plausible and professional
- Wrong answers should be things an officer MIGHT reasonably do, but that violate the specific procedure in the source text
- Make distractors that are CLOSE to correct but wrong in a specific way (wrong order of steps, missing a required notification, acting outside authority, skipping a required step)
- Avoid obviously wrong or absurd choices
- Do NOT make the correct answer obviously longer or more detailed than the others
- All choices should be similar in length and detail level

DIFFICULTY:
- Most questions should be "medium" or "hard"
- "easy" questions should be rare

Here is an example of the style and length expected:

"PO Collura responds to a 10-10 suspicious package at 100 Linden Boulevard in the confines of the 67th precinct. Upon arrival, he observes a small box with a partially open flap. The box appears to be leaking fluid, and the officer can see a piece of copper wire visible. The box is located on the side of the pathway to the building, not far from the building trash. No one is around except two older ladies from Haiti who he cannot seem to communicate with. In regards to 212-37 and 212-40, it would be MOST appropriate for Officer Collura to do which of the following:"

Output a JSON array with this format:
[
  {
    "prompt": "",
    "choices": ["", "", "", ""],
    "correct_answer": "",
    "explanation": "",
    "difficulty": "easy|medium|hard"
  }
]`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }

  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);

  // Validate each question
  return questions.filter(q =>
    q.prompt &&
    Array.isArray(q.choices) &&
    q.choices.length === 4 &&
    q.correct_answer &&
    q.choices.includes(q.correct_answer) &&
    q.explanation
  );
}
