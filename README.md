# MIK 홈페이지 — Netlify 배포 가이드

## 폴더 구조

```
netlify-site/
├── admin/
│   ├── config.yml      ← Decap CMS 설정 (뉴스·캘린더·갤러리 입력 폼)
│   └── index.html      ← CMS 관리자 페이지
├── content/
│   ├── news/           ← 뉴스 마크다운 파일 (CMS에서 자동 생성)
│   ├── calendar/       ← 레이스 일정 마크다운 파일
│   └── gallery/        ← 갤러리 항목 마크다운 파일
├── public/             ← 빌드 결과물 (Netlify가 서빙)
├── mik-*.html          ← 페이지 소스 파일
├── sitemap.xml
├── build.js            ← 빌드 스크립트 (MD → JSON + HTML 복사)
├── netlify.toml        ← Netlify 배포 설정
└── package.json
```

---

## 1. GitHub 연동

```bash
# 이 폴더를 Git 저장소로 초기화
git init
git add .
git commit -m "MIK 홈페이지 초기 배포"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_ORG/mik-website.git
git push -u origin main
```

---

## 2. Netlify 사이트 생성

1. [app.netlify.com](https://app.netlify.com) 접속
2. **Add new site** → **Import an existing project** → GitHub 선택
3. 저장소 선택 → 빌드 설정 확인:
   - Build command: `node build.js`
   - Publish directory: `public`
4. **Deploy site** 클릭

---

## 3. Netlify Identity 활성화 (CMS 로그인 필수)

1. Netlify 사이트 대시보드 → **Identity** 탭
2. **Enable Identity** 클릭
3. **Registration** → **Invite only** 선택 (외부 접근 차단)
4. **Git Gateway** → **Enable Git Gateway** 클릭
5. **Invite users** → 관리자 이메일 초대

---

## 4. 뉴스 업로드 방법 (운영자 가이드)

### CMS 접속
```
https://YOUR-SITE.netlify.app/admin/
```

### 뉴스 작성 순서
1. **뉴스** 메뉴 클릭 → **새로운 뉴스 글** 버튼
2. 아래 항목 입력:

| 항목 | 설명 |
|---|---|
| 제목 | 뉴스 제목 |
| 카테고리 | 보도자료 / 레이스 리포트 / 공지사항 / 비즈니스 |
| 발행일 | 날짜 선택 |
| 썸네일 이미지 | 이미지 업로드 (선택, 800×480px 권장) |
| 요약 | 목록 카드에 표시되는 한두 줄 설명 (100자 이내) |
| 본문 | 마크다운 에디터로 작성 |
| 피처드 | ON 시 뉴스 페이지 상단 대형 카드로 노출 |
| 외부 링크 | 언론사 원문 URL (선택) |
| 태그 | 검색·분류용 키워드 |

3. **저장** 클릭 → GitHub에 자동 커밋 → Netlify 자동 빌드 (~1분)
4. 빌드 완료 후 사이트 반영

### 레이스 일정 업데이트
1. CMS → **레이스 일정** → 해당 라운드 클릭
2. 상태를 **예정 → 진행 중 → 완료**로 변경
3. 완료 후 결과 입력 (예: "오한솔 3위 / 한재희 DNF")

---

## 5. 커스텀 도메인 연결

1. Netlify 사이트 → **Domain management** → **Add custom domain**
2. 도메인 입력: `miksports.com`
3. DNS 설정 (도메인 구매처):
   - A 레코드: `@` → Netlify IP (대시보드에서 확인)
   - CNAME: `www` → `YOUR-SITE.netlify.app`
4. HTTPS는 Netlify가 자동 발급

---

## 6. 빌드 스크립트 동작 원리

```
content/news/*.md
  → parseMd()로 front matter 파싱
  → public/news-data.json  (뉴스 페이지 목록 API)
  → public/news/{slug}.html  (각 뉴스 상세 페이지)

content/calendar/*.md
  → public/calendar-data.json  (캘린더 표시용)

content/gallery/*.md
  → public/gallery-data.json  (갤러리 표시용)

mik-*.html → public/mik-*.html  (페이지 파일 복사)
admin/     → public/admin/       (CMS 관리자 복사)
sitemap.xml → public/sitemap.xml
```
