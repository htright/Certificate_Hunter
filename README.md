# 기업회계 1급 PDF 원문 · 단계별 풀이 Lite

이 버전은 빈 화면 오류를 피하기 위해 React/PDF.js 없이 브라우저 기본 PDF 뷰어와 순수 JavaScript로 만들었습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/`를 엽니다.

## 포함

- 제89회~제96회 PDF 포함
- 회차 선택
- 재무회계/원가회계 필터
- 문항 검색
- 왼쪽 PDF 원문 페이지
- 오른쪽 단계별 풀이
- 문제별 PDF 페이지 버튼

## 풀이 데이터 수정

`src/data.js`에서 각 문항의 `steps`, `tips`, `pages`를 수정하면 됩니다.
