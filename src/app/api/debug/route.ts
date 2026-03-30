export async function GET() {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'LLM_API_KEY is not set' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say hello' }],
      }),
    });

    const data = await response.json();
    return Response.json({
      status: response.status,
      keyPrefix: apiKey.substring(0, 12) + '...',
      response: data,
    });
  } catch (err) {
    return Response.json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
