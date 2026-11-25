# 체지방 감량 트래커

체중 80.4kg → 72.0kg 감량(골격근량 32.1kg 유지)을 위한 개인용 트래커입니다.
매일의 식사(사진 포함)·체중·운동·눈바디 사진을 기록하면, 남은 하루 매크로를 계산해
탄단지를 채울 구체적인 음식을 추천해 줍니다. 설계 배경은 [DESIGN.md](DESIGN.md) 참고.

## 기술 스택
- **서버**: Node.js + Express + TypeScript, SQLite(`node:sqlite`, 별도 DB 설치 불필요)
- **클라이언트**: React + Vite + TypeScript, `react-router-dom`, `recharts`
- **사진 자동분석**: Gemini API (`GEMINI_API_KEY` 필요, 없어도 수동 입력으로 전체 기능 사용 가능)

## 최초 실행 방법

1. 서버 환경변수 확인/수정: `server/.env`
   ```
   SERVER_PORT=4100
   CLIENT_ORIGIN=http://localhost:5174
   SESSION_SECRET=아무 무작위 문자열로 변경
   APP_PASSWORD=원하는 비밀번호로 변경   ← 기본값 changeme는 반드시 변경하세요
   GEMINI_API_KEY=발급받은 키 (선택, 없으면 AI 자동분석만 비활성화됨)
   ```
2. 의존성 설치 (최초 1회)
   ```bash
   npm run install:all
   ```
3. 서버 + 클라이언트 동시 실행
   ```bash
   npm run dev
   ```
4. 브라우저에서 접속
   ```
   http://localhost:5174
   ```
5. `APP_PASSWORD`로 로그인합니다.

서버는 4100번 포트, 클라이언트(Vite)는 5174번 포트를 사용합니다.
이 방식(`npm run dev`)은 로컬 개발/사용 전용입니다. 외부(폰, 다른 PC)에서 접속하려면 아래를 따라주세요.

## 외부(폰 등)에서 접속하기 — 독립 실행

`start-diet-tracker.ps1` / `stop-diet-tracker.ps1`(둘 다 이 폴더에 있음)이 서버 + Cloudflare Tunnel을
백그라운드(창 없이)로 띄우고 내려줍니다. 이 스크립트로 실행하면 **터미널을 닫거나 Claude Code를 꺼도 계속 동작**합니다.
(`D:\ClaudeAI\cloudflared.exe`를 마인드맵 앱과 공유해서 사용하며, 포트로 구분하므로 서로 간섭하지 않습니다.)

- **수동 시작**: `start-diet-tracker.ps1` 우클릭 → PowerShell로 실행
  (또는 `powershell -ExecutionPolicy Bypass -File start-diet-tracker.ps1`)
- **수동 종료**: `stop-diet-tracker.ps1` 실행
- 코드를 수정한 경우에만 `npm run build`로 새로 빌드한 뒤 `stop-diet-tracker.ps1` → `start-diet-tracker.ps1` 순으로 재시작하세요.
- 현재 외부 접속 주소는 `tunnel.log` 파일에서 `https://...trycloudflare.com` 줄을 확인하면 됩니다.
- 재부팅 후에도 자동으로 켜지길 원하면, 마인드맵 앱처럼 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`에
  `start-diet-tracker.ps1`을 호출하는 배치 파일을 등록하면 됩니다 (필요하면 요청해 주세요).

**주의**
- `trycloudflare.com` 주소는 계정 없이 쓰는 "퀵 터널"이라 재시작할 때마다 주소가 바뀝니다.
- 몸 사진 등 민감한 데이터가 포함되므로, 외부 접속을 켤 경우 `APP_PASSWORD`를 반드시 기본값에서 바꾸고 URL은 개인적으로만 공유하세요.

### (참고) 개발 중 임시로 로컬에서만 띄우기
```bash
npm run dev
```

## Tailscale 고정 주소로 접속하기 (마인드맵과 같은 PC에서 함께 쓰기)

Cloudflare 퀵 터널은 재시작할 때마다 주소가 바뀝니다. Tailscale은 **PC 한 대 = 호스트 이름 하나**(`desktop-xxxx.tailXXXX.ts.net`)이고,
앱은 **HTTPS 포트로 구분**합니다. 마인드맵이 443을 쓰고 있으므로 이 앱은 **8443**을 씁니다. 마인드맵 설정은 건드리지 않습니다.

```
diet-tailscale.bat              내 Tailscale 기기끼리만 접속 (권장 — 몸 사진이 들어 있음)
diet-tailscale.bat -Funnel      인터넷 어디서나 접속 (주소 + APP_PASSWORD 만 알면 열림)
diet-tailscale.bat -Off         이 앱의 매핑 제거
```

- 한 번 실행하면 재부팅 후에도 유지됩니다(`--bg`). 실행 후 주소가 화면에 나오고 클립보드에도 복사됩니다:
  `https://<PC호스트이름>:8443`
- 서버가 먼저 떠 있어야 합니다(`npm run build` → `npm run start`, 포트 4100). 터널 없이도 서버만 `start-diet-tracker.ps1` 로 띄워도 됩니다.
- **Serve(기본)**: 폰에도 Tailscale 앱을 설치하고 같은 계정으로 로그인해야 열립니다.
- **Funnel**: HTTPS 포트가 443·8443·10000 세 개만 허용됩니다. 공개 인터넷에 노출되므로 `APP_PASSWORD` 를 반드시 바꾸세요.
- `server/.env` 의 `CLIENT_ORIGIN` 은 바꾸지 않아도 됩니다. 빌드된 서버는 화면과 API 가 같은 주소라 CORS 를 타지 않습니다
  (`npm run dev` 의 5174 접속에서만 쓰입니다).
- **절대 `tailscale serve reset` / `tailscale funnel reset` 을 쓰지 마세요.** 마인드맵을 포함한 모든 매핑이 지워집니다.
- 스크립트는 `C:\Program Files\Tailscale\tailscale.exe` 를 쓰고, 없으면 PATH 의 `tailscale` 을 찾습니다. 포트를 바꾸려면 `-HttpsPort 10000` 처럼 넘기세요.

## 폰 홈 화면에 앱처럼 설치하기 (PWA)

빌드된 버전(`npm run build`로 만든 프로덕션 서버, 즉 `start-diet-tracker.ps1`로 띄운 상태)에 접속하면
"홈 화면에 추가"로 설치할 수 있습니다. 앱스토어 등록 없이 아이콘을 눌러 전체화면(주소창 없이)으로 열립니다.
(개발 중 `npm run dev`로 띄운 5174 포트에서는 PWA 기능이 꺼져 있습니다 — 반드시 빌드된 버전으로 접속해야 합니다.)

- **Android(Chrome)**: 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"
- **iPhone(Safari)**: 공유 버튼 → "홈 화면에 추가"

아이콘은 `client/public/icons/`에 있고, `client/scripts/generate-icons.mjs`로 재생성할 수 있습니다.

## Android 앱(Play 스토어용) — Capacitor

`client/android/`에 Capacitor로 생성한 네이티브 Android 프로젝트가 이미 준비되어 있습니다
(앱 아이콘/스플래시 전체 해상도 포함, `applicationId: com.diettracker.app`).

**단, 이 프로젝트를 실제로 빌드(APK 생성)하려면 이 PC에 없는 것들이 필요합니다:**
- Android Studio (또는 최소 Android SDK + JDK) — 현재 이 PC에는 설치되어 있지 않음
- 앱이 접속할 **고정 서버 주소** — `client/capacitor.config.ts`의 `server.url`에 넣어야 함.
  지금은 비어 있어서(주석 처리) 앱을 그대로 빌드하면 데이터가 뜨지 않습니다.
  Cloudflare Named Tunnel + 보유 도메인으로 고정 주소를 만든 뒤 해당 URL로 채워주세요.

Android Studio 설치 후 빌드 절차:
```bash
cd client
npm run build          # 최신 웹 코드를 dist에 반영
npx cap sync android    # dist를 android 프로젝트로 복사 + 설정 동기화
npx cap open android    # Android Studio가 열림 → Build > Build APK(또는 Play Console용 AAB)
```

**iOS는 이 PC(Windows)에서 빌드할 수 없습니다** — Xcode는 macOS 전용입니다. Mac이 생기면
`npx cap add ios` 이후 같은 방식으로 진행할 수 있습니다.

**Play 스토어/App Store에 실제로 등록하려면** Google Play 개발자 계정(1회 $25)과
Apple Developer 계정(연 $99)이 필요하며, 결제·본인인증이 들어가는 절차라 직접 가입하셔야 합니다.

## 주요 기능
- **오늘**: 오늘까지 먹은 양 기준으로 남은 칼로리/탄단지를 계산하고, 부족한 매크로를 채울 구체적 음식(그램 수 포함)을 추천. 정기권 D-day 표시
- **체중**: 공복 체중 기록, 시작→목표 진행률, 시계열 그래프, 주간 변화량 자동 계산, 주간 리뷰(수면/컨디션 기록 + 다음 주 목표 메모)
- **식사**: 달력에서 날짜 선택 → 아침/점심/간식/저녁/야식 슬롯별로 여러 음식을 각각 기록. 사진 업로드 또는 외부 URL 입력 후 "AI로 음식 분석하기"로 Gemini 자동 분석(수정 가능)
- **눈바디**: 날짜별 전신 사진 업로드, 시간순 갤러리로 비교
- **운동**: 웨이트/러닝/스크린골프/복싱/기타 종류·시간·강도 기록
- **설정**: 목표 체중/골격근량/칼로리/단백질/지방비율/정기권 만료일 수정

## 데이터 위치
- DB 파일: `server/data/tracker.db`
- 사진: `server/uploads/meals/`, `server/uploads/body/`

이 두 폴더를 백업하면 모든 기록과 사진이 함께 보존됩니다.
