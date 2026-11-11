# 사원증 신청 페이지 (외부 입사예정자용)

입사예정자가 이름과 사원증 이미지를 골라 신청하는 정적 페이지. 빌드 없음, GitHub Pages 배포(`.nojekyll`).

## 구조
- `npixel/index.html` — 엔픽셀 (`CORP="NPIXEL"`, 브랜드색 `#00CCFF`, 이미지 6종)
- `ex2games/index.html` — 이엑스투게임즈 (`CORP="EX2"`, 브랜드색 `#F4A022`, 이미지 11종)
- `*/i/<hash>_s.webp`(썸네일), `<hash>_b.webp`(큰 이미지)
- 두 HTML은 **회사별 값만 다르고 나머지는 동일**. 공통 로직을 고치면 두 파일 모두 같이 수정할 것.
  회사별 차이: `<title>`, 파비콘/로고(인라인 SVG data URI), `--brand/--ink/--soft/--ring`, `.brand-mark` 높이,
  `body[data-corp]`, 갤러리 버튼 목록·이미지 개수 문구, `<script>` 첫 줄의 `CORP`, `ENDPOINT`, `IMAGES`.

## 동작
1. 한글 이름 / 영문 이름(이름 성 순서, 영문만 허용, 단어 첫 글자 자동 대문자) 입력
2. 갤러리에서 이미지 1개 선택 → 오른쪽(모바일은 신청 버튼 위) 사원증 미리보기
3. 확인 모달 → `ENDPOINT`(Google Apps Script 웹앱)로 POST
   - body: `{ko, en, image: IMAGES[i].name, rid, website}`, `Content-Type: text/plain`(CORS preflight 회피)
   - 응답 `{ok:true}` 기대, 60초 타임아웃
   - `rid`: 재시도 시 중복 접수 방지용 요청 ID (서버에서 rid로 dedupe)
   - `website`: 허니팟(봇 차단)
4. 완료 화면 표시, localStorage 임시저장(`idcard_draft_<CORP>`, 30일) 삭제

`ENDPOINT`를 빈 문자열로 두면 저장 없이 미리보기 모드로 동작.

## Apps Script 서버 코드 (`gas/`)
- `gas/Code.gs`, `gas/appsscript.json` — 제출을 받는 독립 Apps Script(doPost만 있음).
  배포 원본은 Drive의 「사원증 신청 페이지(신규입사자)」 프로젝트(엔픽셀용).
- **반영 방식:** 사용자가 GitHub에서 `gas/Code.gs`를 복사 → Apps Script 편집기에 붙여넣기 → 저장 →
  배포 관리 → 새 버전으로 배포. 그래서 서버 코드 수정은 항상 `gas/Code.gs` 전체가 그대로 붙여넣기 가능한 상태여야 함.
  Claude는 Apps Script를 직접 수정·배포할 수 없음(Drive 커넥터로 읽기만 가능).
- 법인별로 프로젝트가 따로 배포됨. 상단 상수 `SHEET_URL`, `CORP`('NPIXEL'/'EX2')만 다름.
  저장소의 `Code.gs`는 엔픽셀 값 기준 — EX2 쪽에 붙여넣을 땐 두 상수를 EX2 값으로 바꿔야 함.
- 처리: 이름 재검증 → Drive 이미지 폴더(`IMAGE_FOLDER`)에 파일 존재 확인 → 스프레드시트 '사원증 신청' 탭에
  헤더 이름 기준으로 행 추가(상태 '접수') → `NOTIFY` 메일 알림. 시간당 30건 제한, rid 6시간 캐시로 중복 방지,
  허니팟 걸리면 저장 안 하고 메일만(시간당 5통).
- 프론트의 검증 규칙·전송 필드(`ko, en, image, rid, website`)를 바꾸면 `Code.gs`도 같이 맞출 것.

## 참고
- 사원증 카드는 54×86 비율, `container-type` + `--m`(1mm 단위) 기반 배치.
- `.idc.back` 관련 CSS(뒷면)는 남아 있지만 현재 JS에서 뒷면은 렌더링하지 않음.
- `noindex`, `no-referrer` 설정 — 외부 공개 링크로만 배포.
- 커밋 메시지는 한국어.
