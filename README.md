# Scent Finder (웹앱)

AI가 15가지 질문을 바탕으로 당신의 취향을 분석하고, 실제 판매 중인 향수 추천 결과를 만들어주는 간단한 웹앱입니다. 프론트엔드는 정적 페이지이고, Gemini API 호출은 서버리스 함수(`/api/gemini`)로 프록시되어 API Key가 노출되지 않습니다.

## 로컬 실행

빌드가 필요 없는 정적 사이트입니다. 아무 웹서버로 열어도 됩니다.

- Python
  - `python3 -m http.server 5173` 후 `http://localhost:5173` 접속
- Node(serve)
  - `npx serve .` 후 출력된 주소 접속

서버리스 함수는 Vercel 환경에서 동작합니다. 로컬에서 Vercel CLI로 테스트하려면:

```
npm i -g vercel
vercel dev
```

## 환경변수

- `GEMINI_API_KEY`: Google AI Studio에서 발급받은 키 (서버리스 함수에서만 사용)

Vercel 대시보드 > Settings > Environment Variables 에 추가하세요.

## 배포 (Vercel)

1. 이 폴더를 GitHub로 푸시합니다.
2. Vercel에서 New Project > 해당 리포지토리 선택
3. Framework: Other (정적)로 그대로 진행 (Build command/Output 비워도 OK)
4. Environment Variables에 `GEMINI_API_KEY` 추가
5. Deploy

배포가 끝나면 `/`는 정적 `index.html`을, `/api/gemini`는 서버리스 함수를 제공합니다.

## 구조

- `index.html`: 앱 UI 및 클라이언트 로직 (Tailwind CDN 사용)
- `api/gemini.js`: Gemini API 프록시 (서버리스)
- `public/manifest.webmanifest`: PWA 기본 메타
- `vercel.json`: 정적 라우팅 및 API 경로 설정

## 주의사항

- API Key를 클라이언트로 전달하지 않습니다. 반드시 서버리스 함수로 호출하세요.
- 현재 아이콘 이미지는 포함되어 있지 않습니다. PWA 아이콘을 원하면 `public/`에 PNG 아이콘을 추가하고 `manifest.webmanifest`의 `icons`를 채워주세요.

## 커스터마이징 아이디어

- Tailwind를 CDN 대신 빌드 파이프라인으로 교체 (선택)
- 추천 결과 카드에 실제 제품 이미지 연동
- 오프라인 캐시를 위한 Service Worker 추가

