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

## 관련 저장소 (중요)
- 이 저장소(`welcome-idcard/apply`)는 **GitHub Pages로 공개 배포되는 결과물**만 둠. 서버 코드·비공개 값은 여기 두지 말 것.
- 원본 소스와 Apps Script 코드는 `npixel-ter/bizcard-idcard-request` (임직원용 명함·사원증 앱과 같은 저장소):
  - `src/newhire/index.src.html`, `build_newhire.py`, `endpoints.json` → 이 저장소의 `npixel/`, `ex2games/`를 생성
  - `src/newhire/Intake.gs` → 빌드되어 `npixel/Intake.gs`, `ex2/Intake.gs` (입사예정자 제출 받는 Apps Script)
- 사용자는 그 저장소의 `npixel/*.gs`, `ex2/*.gs`를 GitHub에서 복사 → Apps Script에 붙여넣고 배포함.
- 페이지 수정 요청 시: 이 저장소의 HTML을 고쳐 Pages에 반영하고, 가능하면 원본(`src/newhire/index.src.html`)에도 같은 변경을 맞춰 둘 것.

## 참고
- 사원증 카드는 54×86 비율, `container-type` + `--m`(1mm 단위) 기반 배치.
- `.idc.back` 관련 CSS(뒷면)는 남아 있지만 현재 JS에서 뒷면은 렌더링하지 않음.
- `noindex`, `no-referrer` 설정 — 외부 공개 링크로만 배포.
- 커밋 메시지는 한국어.
