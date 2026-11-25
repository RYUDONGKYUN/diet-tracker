# 체지방 감량 트래커 — 설계서 (DESIGN.md)

개인용 체지방 감량 트래커. InBody 수치 기반 목표(체중/골격근/칼로리/단백질)를 관리하고,
매일의 식사·체중·운동·눈바디 사진을 기록해 하루 남은 매크로를 계산하고 추천 식품을 제시한다.

## 1. 스택 선택 이유

| 영역 | 선택 | 이유 |
|---|---|---|
| 서버 | Node.js + Express + TypeScript | 이 저장소([mindmap-app](../README.md))와 동일한 패턴을 재사용해 유지보수 부담을 낮춤 |
| DB | `node:sqlite` (Node 22 내장) | 별도 설치·네이티브 컴파일 없이 단일 파일로 영구 저장. `better-sqlite3` 등 네이티브 모듈은 이 PC에서 빌드 도구 없이 설치 실패 이력이 있어 회피 |
| 인증 | 공유 비밀번호(`APP_PASSWORD`) + 세션 쿠키 | 1인 전용 앱이라 회원가입/계정 개념이 불필요. 다만 외부(Cloudflare 터널)로 노출되고 몸 사진 등 민감 데이터가 있어 최소한의 게이트는 둠 |
| 프론트 | React + Vite + TypeScript | 마인드맵 앱과 동일 스택. 라우팅은 `react-router-dom`, 그래프는 `recharts` |
| 사진 저장 | 파일시스템(`server/uploads/`) + DB엔 경로만 저장 | DB 파일 비대화 방지, 정적 파일 서빙이 단순함 |
| 사진 자동분석 | Gemini API(`gemini-2.0-flash`) 서버 프록시 | API 키를 클라이언트에 노출하지 않기 위해 반드시 서버를 경유 |
| 모바일 앱(1단계) | PWA(`vite-plugin-pwa`) | 앱스토어 심사/개발자 계정 없이 "홈 화면에 추가"로 설치형 경험 제공 |
| 모바일 앱(2단계) | Capacitor(Android만 우선) | 기존 웹 코드를 그대로 재사용하는 WebView 래핑. iOS는 Xcode(macOS 전용)가 없어 보류, 앱이 접속할 고정 서버 주소도 아직 미정이라 실제 동작은 도메인 준비 후로 미룸 |

## 2. 폴더 구조

```
diet-tracker/
├── DESIGN.md                  # 이 문서
├── README.md                   # 실행 방법
├── package.json                 # 루트: dev/build/start
├── .env.example 대신 server/.env 참고
├── server/
│   ├── src/
│   │   ├── index.ts            # Express 앱 진입점
│   │   ├── db.ts                # SQLite 스키마 + 초기 시드
│   │   ├── sessionStore.ts      # express-session용 SQLite 스토어
│   │   ├── routes/
│   │   │   ├── auth.ts          # 로그인/로그아웃/세션 상태/gemini 설정 여부
│   │   │   ├── profile.ts       # 사용자 프로필 조회/수정 + 목표 자동계산
│   │   │   ├── weight.ts        # 체중 기록 CRUD + 진행률/주간변화 요약
│   │   │   ├── meals.ts         # 끼니 기록 CRUD + 사진 업로드 + Gemini 분석
│   │   │   ├── exercise.ts      # 운동 기록 CRUD
│   │   │   ├── bodyPhotos.ts    # 눈바디 사진 CRUD
│   │   │   ├── recommend.ts     # 오늘의 탄단지 추천
│   │   │   └── weeklyReview.ts  # 주간 리뷰 CRUD
│   │   └── lib/
│   │       ├── macros.ts        # 목표 매크로 산출 + 추천 로직 + 음식 DB
│   │       ├── gemini.ts        # Gemini Vision API 호출
│   │       └── upload.ts        # multer 업로드 설정
│   ├── data/tracker.db          # SQLite 파일 (gitignore)
│   └── uploads/{meals,body}/    # 사진 저장 (gitignore)
└── client/
    └── src/
        ├── App.tsx               # 라우팅 + 인증 게이트 + 탭바
        ├── context/AuthContext.tsx
        ├── api/client.ts         # fetch 래퍼(세션 쿠키 포함)
        ├── types.ts
        ├── lib/date.ts           # 날짜/D-day 유틸
        ├── components/           # Calendar, MacroBar, TabBar, MealItemModal
        └── pages/                # Today, Weight, Calendar, BodyPhotos, Exercise, Settings
```

## 3. 데이터 모델

### user_profile (싱글턴, id=1)
목표치 전체를 담는 단일 행. 감량기/유지기 각각의 칼로리·단백질 목표, 지방 비율(`fat_pct_of_kcal`),
정기권 만료일(`screen_golf_expiry`, `gym_expiry`)을 포함. `PATCH /api/profile`로 부분 수정.

### weight_logs
`date`가 UNIQUE — 하루 1건, 같은 날짜 재입력 시 UPSERT(덮어쓰기).

### meal_items
하나의 `(date, slot)` 조합에 여러 행이 존재할 수 있음(예: 점심에 밥/국/반찬을 각각 기록).
`slot`은 `breakfast|lunch|snack|dinner|late_night` 중 하나. `photo_path`는
`/uploads/meals/xxx.jpg`(로컬 업로드) 또는 `https://...`(외부 URL) 둘 다 허용.
`source`는 `manual|gemini|url` — Gemini 분석 결과인지 사용자가 직접 입력했는지 구분.

### body_photos
날짜별 전신 사진. `angle`(front/side/back)은 선택 필드.

### exercise_logs
`type`은 `weight|running|screen_golf|boxing|other`, `other`일 때만 `custom_label` 사용.

### weekly_reviews
`week_start`(월요일 날짜) UNIQUE. 주간 회고 + 다음 주 목표 조정 메모.

### sessions
express-session의 SQLite 백엔드 스토어(로그인 세션 저장, 앱 재시작에도 로그인 유지).

## 4. 핵심 로직

### 4.1 오늘의 목표 매크로 산출 (`lib/macros.ts computeTargets`)
사용자가 제공한 값은 칼로리와 단백질(범위)뿐이므로:
1. 오늘의 단백질 목표 = `(protein_min + protein_max) / 2` (감량기 기준 140~150 → 145g)
2. 지방 목표(g) = `칼로리 × fat_pct_of_kcal(기본 0.25) / 9`
3. 탄수화물 목표(g) = `(칼로리 − 단백질×4 − 지방×9) / 4`

`fat_pct_of_kcal`는 설정 화면에서 사용자가 직접 조정 가능(기본값 25%).

### 4.2 오늘의 탄단지 추천 (`recommend.ts` + `lib/macros.ts buildSuggestions`)
1. 오늘 목표(위 4.1) 대비 `meal_items`에서 오늘 날짜 합계를 뺀 **잔여 매크로**를 구함(음수는 0으로 clamp)
2. 잔여 매크로가 8g 이상인 항목(탄/단/지)에 대해서만 추천 생성
3. `FOOD_DB`(g당 매크로 밀도 테이블: 닭가슴살, 두부, 계란, 그릭요거트, 현미밥, 고구마 등)에서
   해당 매크로 밀도가 높은 순으로 2개를 골라, 잔여량을 채우는 데 필요한 정확한 그램 수/개수를 역산해 문구 생성
   (예: "단백질 40g 부족 → 닭가슴살 174g 또는 소고기 안심 190g 추천")

### 4.3 체중 진행률/주간 변화 (`weight.ts /summary`)
- 진행률 = `(시작체중 − 최근체중) / (시작체중 − 목표체중) × 100`
- 주간 변화 = 최근 기록일 기준 7일 이전 시점(또는 그 이전 가장 가까운 기록)과의 체중 차

### 4.4 D-day
클라이언트 `lib/date.ts dDay()`가 오늘과 `screen_golf_expiry`/`gym_expiry`의 날짜 차를 계산해
`오늘` 화면 상단에 칩으로 표시. 7일 이내면 강조색으로 표시.

### 4.5 Gemini 사진 분석 흐름
1. 사용자가 끼니 슬롯에 사진을 업로드하거나 외부 URL을 입력
2. "AI로 음식 분석하기" 클릭 → (아직 저장 전이면) 먼저 `POST /api/meals`로 임시 저장 → `POST /api/meals/:id/analyze` 호출
3. 서버가 사진 바이트를 읽어 Gemini에 프롬프트("JSON으로만 응답")와 함께 전송, 응답을 파싱해 DB 갱신
4. 분석 결과는 폼에 채워지며 **사용자가 그대로 수정 가능** — 저장 버튼을 눌러야 최종 확정
5. `GEMINI_API_KEY`가 `.env`에 없으면 "AI로 분석하기" 버튼이 비활성화되고 안내 문구가 표시됨(`GET /api/auth/config`로 확인)

## 5. 인증 / 보안

- 회원가입 없이 `APP_PASSWORD` 단일 비밀번호로 로그인, `express-session` + SQLite 세션 스토어로 세션 유지
- `/uploads` 정적 파일도 `requireAuth` 미들웨어로 보호 (몸 사진 등이 URL만 알면 보이는 것을 방지)
- Gemini API 키는 서버 `.env`에만 존재, 클라이언트/응답에 절대 노출되지 않음
- 외부 노출 시(Cloudflare 퀵 터널) 반드시 `APP_PASSWORD`를 기본값(`changeme`)에서 변경할 것

## 6. 재사용 시 체크리스트

- [ ] `server/.env`에 `APP_PASSWORD`, `SESSION_SECRET`, `GEMINI_API_KEY` 설정했는가
  (기본값 `changeme`를 그대로 쓰면 외부 노출 시 위험)
- [ ] `server/data/`, `server/uploads/` 폴더를 정기적으로 백업하고 있는가
  (이 두 폴더만 있으면 모든 기록·사진이 복원됨)
- [ ] 목표치(체중/칼로리/단백질/정기권 만료일) 변경은 앱의 "설정" 화면에서 — `user_profile`은 항상 1행만 존재해야 함
- [ ] 사진 삭제 시 DB row와 실제 파일이 함께 삭제되는지 확인 (`meals.ts`/`bodyPhotos.ts`의 DELETE 핸들러가 처리)
- [ ] 포트 충돌 주의: 서버는 `SERVER_PORT`(기본 4100), 클라이언트는 Vite `5174`.
      **`PORT`라는 이름의 환경변수는 사용하지 말 것** — 이 개발 환경(Claude Code 프리뷰 브라우저)이
      dev 서버 실행 시 `PORT` 환경변수를 클라이언트 포트 값으로 자동 주입하는 경우가 있어,
      백엔드가 일반적인 `PORT`를 읽으면 클라이언트와 같은 포트로 바인딩되어 충돌한다 (`SERVER_PORT`로 회피함)
- [ ] 외부 접속용 Cloudflare 터널 주소는 `tunnel.log`에서 확인 (마인드맵 앱과 동일한 방식, [start-diet-tracker.ps1](start-diet-tracker.ps1) 참고)
- [ ] 고정 주소가 필요하면 Tailscale: `diet-tailscale.bat` (기본 Serve = 내 기기만, `-Funnel` = 공개). 같은 PC의 마인드맵(443)과는 HTTPS 포트(8443)로 구분한다. 근거·주의는 README "Tailscale 고정 주소" 절
- [ ] PWA(홈 화면 설치)는 `npm run dev`가 아니라 **빌드된 프로덕션 서버**에서만 동작함 — 서비스워커(`sw.js`)/매니페스트는 `no-cache`로 서빙되도록 `server/src/index.ts`에서 예외 처리되어 있으니, 정적 파일 캐시 설정을 바꿀 때 이 부분을 건드리지 않도록 주의
- [ ] Android(Capacitor) 앱을 실제로 동작시키려면 `client/capacitor.config.ts`의 `server.url`에 **고정** 백엔드 주소를 넣어야 함 — 비워두면 앱이 번들된 정적 파일만 로드하고 API 호출이 실패함. 코드를 고치고 나면 `npm run build && npx cap sync android`로 반드시 다시 동기화할 것
