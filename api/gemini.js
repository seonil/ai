export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is not set' });
  }

  try {
    const { answers } = req.body || {};
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid request: answers must be an array' });
    }

    let promptText = `
당신은 세계 최고의 향수 소믈리에입니다. 사용자의 다음 취향 분석 결과를 바탕으로, 사용자를 위한 독창적인 '향기 페르소나'를 정의하고, 시중에서 실제로 판매되는 향수 3가지를 추천해주세요.
답변은 반드시 아래의 JSON 형식에 맞춰 한국어로 생성해야 합니다.
- 각 향수에 대한 설명은 사용자의 취향과 어떻게 연결되는지 구체적으로 서술해주세요.
- 'price'에는 대표 용량과 함께 예상 가격대를 "00만원대 / 00ml" 형식으로 기입해주세요.
- 'purchaseLink'에는 "https://search.shopping.naver.com/search/all?query=브랜드+향수이름" 형식의 검색 URL을 생성해주세요.

사용자 답변:
`;
    answers.forEach(item => {
      if (item && Array.isArray(item.answers)) {
        const filtered = item.answers.filter(x => typeof x === 'string' && x.trim() !== '');
        if (filtered.length) {
          promptText += `- ${item.question}: ${filtered.join(', ')}\n`;
        }
      }
    });

    promptText += `

JSON 출력 형식:
{
  "persona": { "title": "페르소나 제목", "description": "페르소나에 대한 상세 설명 (2-3문장)" },
  "recommendations": [
    { "brand": "향수 브랜드", "name": "향수 이름", "description": "사용자 취향과 연결된 추천 이유", "keywords": ["#키워드1", "#키워드2", "#키워드3"], "price": "00만원대 / 00ml", "purchaseLink": "네이버 쇼핑 검색 URL" },
    { "brand": "향수 브랜드", "name": "향수 이름", "description": "사용자 취향과 연결된 추천 이유", "keywords": ["#키워드1", "#키워드2", "#키워드3"], "price": "00만원대 / 00ml", "purchaseLink": "네이버 쇼핑 검색 URL" },
    { "brand": "향수 브랜드", "name": "향수 이름", "description": "사용자 취향과 연결된 추천 이유", "keywords": ["#키워드1", "#키워드2", "#키워드3"], "price": "00만원대 / 00ml", "purchaseLink": "네이버 쇼핑 검색 URL" }
  ]
}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: promptText }] }] };

    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ error: 'Gemini API error', status: upstream.status, detail: text });
    }

    const result = await upstream.json();
    const candidate = result?.candidates?.[0];
    const textResponse = candidate?.content?.parts?.[0]?.text || '';
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Could not extract valid JSON from AI response' });
    }

    try {
      const jsonString = jsonMatch[1] || jsonMatch[2];
      const parsed = JSON.parse(jsonString);
      return res.status(200).json(parsed);
    } catch (e) {
      return res.status(502).json({ error: 'Failed to parse JSON from AI response' });
    }
  } catch (err) {
    console.error('[api/gemini] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

