function formatAnswerLines(answers) {
  let lines = '사용자 답변:\n';
  answers.forEach(item => {
    if (!item || !Array.isArray(item.answers)) return;
    const filtered = item.answers
      .map(text => (typeof text === 'string' ? text.trim() : ''))
      .filter(Boolean);
    if (filtered.length) {
      lines += `- ${item.question}: ${filtered.join(', ')}\n`;
    }
  });
  return lines;
}

function getDiscoverPrompt(answers) {
  return `당신은 세계 최고 수준의 퍼퓸 소믈리에입니다. 아래 사용자의 취향 분석 결과를 바탕으로, 사용자를 가장 빛나게 해줄 '향기 페르소나'를 정의하고 여기에 어울리는 시판 향수 3가지를 추천해 주세요.\n답변은 반드시 아래 JSON 형식에 맞춰 한국어로 작성해야 합니다.\n- 'persona' 섹션에는 페르소나의 이름과 2~3문장 분량의 감성적인 설명을 작성해주세요.\n- 'recommendations' 섹션에는 추천 향수의 브랜드, 이름, 추천 이유, 3개의 키워드(해시태그 형식), 예상 가격대를 "00만원대 / 00ml" 형식으로 작성하고, 네이버 쇼핑 검색 URL을 생성해주세요.\n\n${formatAnswerLines(answers)}\nJSON 출력 형식:\n{\n  "persona": {\n    "title": "페르소나 제목",\n    "description": "페르소나 상세 설명"\n  },\n  "recommendations": [\n    {\n      "brand": "추천 향수 브랜드 1",\n      "name": "추천 향수 이름 1",\n      "description": "추천 이유 1",\n      "keywords": ["#키워드", "#키워드", "#키워드"],\n      "price": "00만원대 / 00ml",\n      "purchaseLink": "https://search.shopping.naver.com/search/all?query=브랜드+향수이름"\n    },\n    {\n      "brand": "추천 향수 브랜드 2",\n      "name": "추천 향수 이름 2",\n      "description": "추천 이유 2",\n      "keywords": ["#키워드", "#키워드", "#키워드"],\n      "price": "00만원대 / 00ml",\n      "purchaseLink": "https://search.shopping.naver.com/search/all?query=브랜드+향수이름"\n    },\n    {\n      "brand": "추천 향수 브랜드 3",\n      "name": "추천 향수 이름 3",\n      "description": "추천 이유 3",\n      "keywords": ["#키워드", "#키워드", "#키워드"],\n      "price": "00만원대 / 00ml",\n      "purchaseLink": "https://search.shopping.naver.com/search/all?query=브랜드+향수이름"\n    }\n  ]\n}`;
}

function getCreatePrompt(answers) {
  let prompt = `당신은 천재적인 조향사입니다. 사용자의 다음 취향 분석 결과를 바탕으로, 세상에 없는 새로운 향수를 만들어주세요.\n답변은 반드시 아래의 JSON 형식에 맞춰 한국어로 생성해야 합니다.\n- 'perfume' 섹션에는 창조한 향수의 이름, 사용자의 답변을 토대로 한 감성적인 설명, 그리고 Top, Middle, Base 노트를 각각 1~2개의 핵심 원료로 지정해주세요.\n- 'recommendations' 섹션에는 당신이 창조한 향수와 가장 비슷한 분위기를 가진, 시중에서 판매되는 실제 향수 2가지를 추천해주세요.\n- 추천 향수의 'price'에는 대표 용량과 함께 예상 가격대를 "00만원대 / 00ml" 형식으로 기입해주세요.\n- 추천 향수의 'purchaseLink'에는 "https://search.shopping.naver.com/search/all?query=브랜드+향수이름" 형식의 검색 URL을 생성해주세요.\n\n`;
  prompt += formatAnswerLines(answers);
  prompt += `\nJSON 출력 형식:\n{\n  "perfume": {\n    "name": "새롭게 창조한 향수 이름",\n    "description": "사용자의 답변을 토대로 한 감성적인 향수 설명 (2-3문장)",\n    "notes": { "top": "탑노트 원료", "middle": "미들노트 원료", "base": "베이스노트 원료" }\n  },\n  "recommendations": [\n    { "brand": "추천 향수 브랜드 1", "name": "추천 향수 이름 1", "description": "창조된 향수와 비슷한 이유", "price": "00만원대 / 00ml", "purchaseLink": "네이버 쇼핑 URL 1" },\n    { "brand": "추천 향수 브랜드 2", "name": "추천 향수 이름 2", "description": "창조된 향수와 비슷한 이유", "price": "00만원대 / 00ml", "purchaseLink": "네이버 쇼핑 URL 2" }\n  ]\n}`;
  return prompt;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is not set' });
  }

  try {
    const { answers, mode } = req.body || {};
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid request: answers must be an array' });
    }

    const promptText = mode === 'create'
      ? getCreatePrompt(answers)
      : getDiscoverPrompt(answers);

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
    } catch (err) {
      return res.status(502).json({ error: 'Failed to parse JSON from AI response' });
    }
  } catch (err) {
    console.error('[api/gemini] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
