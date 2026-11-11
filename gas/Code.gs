/**
 * 입사예정자 사원증 제출 받기 — 재직자용 앱과 완전히 분리된 독립 Apps Script
 *
 * 왜 따로 두나: 외부인이 쓰려면 '모든 사용자' 공개 배포가 필요한데, 재직자용 앱을 공개하면
 *              승인·설정 기능까지 외부에 노출될 위험이 생깁니다. 이 앱은 제출 받기(doPost)만 합니다.
 * 설치: script.google.com 새 프로젝트(법인 계정) → 이 코드 붙여넣기 →
 *       배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자)
 */
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1f42PODhXijoTJQC3WckS7KRai2whSFc9mWUfDimw2V4/edit';      // 해당 법인 '명함·사원증 신청' 스프레드시트 링크
const CORP = 'NPIXEL';     // 'NPIXEL' 또는 'EX2'
const NOTIFY = 'hanter@npixel.co.kr';   // 새 신청 알림 메일
const IMAGE_FOLDER = { NPIXEL: '1UJIjjYRrSo6IBRNTsiI5zn_2PJyfCiis', EX2: '176_gBTuXeLIsudCqVra5LOEp-qjMWV-j' };

const LABEL = { NPIXEL: '엔픽셀', EX2: '이엑스투게임즈' };
const TAB = '사원증 신청';
const TZ = 'Asia/Seoul';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    // 봇 함정 칸이 채워지면 저장하지 않되, 비밀번호 관리자 자동 입력일 수도 있어 담당자에게 내용을 알림 (시간당 5통까지)
    if (d.website) { trapAlert_(d); return json_({ ok: true }); }
    const ko = clean_(d.ko, 30), en = clean_(d.en, 60), image = clean_(d.image, 120);
    if (!ko) throw new Error('한글 이름을 입력해 주세요.');
    if (!/^[A-Za-z][A-Za-z .'\-]*$/.test(en)) throw new Error('영문 이름을 확인해 주세요.');
    if (!limit_()) throw new Error('신청이 많아 잠시 후 다시 시도해 주세요.');
    const file = findImage_(image);   // 이미지 폴더에 실제로 있는 파일만 접수 (발주 때 원본 첨부에 사용)
    if (!file) throw new Error('이미지를 다시 선택해 주세요.');

    const now = new Date();
    const row = {
      '신청번호': 'N' + Utilities.formatDate(now, TZ, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10),
      '신청일시': Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm:ss'),
      '법인': CORP, '국문명': ko, '영문명': en, '사원증 이미지': file.getName(), '이미지 파일ID': file.getId(),
      '신청 계정': '입사예정자', '상태': '접수', '비고': '입사예정자 페이지'
    };
    const rid = clean_(d.rid, 60), cache = CacheService.getScriptCache();
    let saved = false;
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(20000);
      if (rid && cache.get('rid_' + rid)) return json_({ ok: true });   // 재시도로 다시 온 같은 신청
      const sh = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(TAB);
      const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
      sh.appendRow(head.map(function (h) { const v = row[String(h).trim()]; return v == null ? '' : guard_(v); }));
      saved = true;
      if (rid) { try { cache.put('rid_' + rid, '1', 21600); } catch (e) { console.warn(e); } }
    } catch (err) {
      // 시트 저장 실패 — 담당자가 메일로 받아 직접 넣을 수 있게 내용을 함께 보냄
      if (!saved) {
        try {
          MailApp.sendEmail(NOTIFY, '[오류][' + LABEL[CORP] + '] 입사예정자 신청 저장 실패 – ' + ko,
            '시트에 저장하지 못했어요. 신청자 화면에는 다시 시도하라고 표시됐어요.\n\n이름: ' + ko + ' (' + en + ')\n이미지: ' + image + '\n시각: ' + row['신청일시'] + '\n원인: ' + err + '\n\n' + SHEET_URL);
        } catch (e) { console.warn(e); }
        throw new Error('접수되지 않았어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally { try { lock.releaseLock(); } catch (e) {} }

    try {
      MailApp.sendEmail(NOTIFY, '[' + LABEL[CORP] + '] 입사예정자 사원증 신청 – ' + ko,
        '이름: ' + ko + ' (' + en + ')\n이미지: ' + image + '\n\n승인하기: ' + SHEET_URL + '\n(시트 상단 메뉴 명함·사원증 → 승인 관리 열기)');
    } catch (err) { console.warn(err); }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function findImage_(name) {
  if (!name) return null;
  const folder = DriveApp.getFolderById(IMAGE_FOLDER[CORP]);
  const names = [name, name + '.png', name + '.jpg', name + '.jpeg', name + '.webp'];
  for (let i = 0; i < names.length; i++) {
    const it = folder.getFilesByName(names[i]);
    if (it.hasNext()) return it.next();
  }
  return null;
}

/** 공개 주소 남용 방지 — 시간당 30건 초과 시 거절 (입사자 수 대비 충분히 넉넉한 값) */
function limit_() {
  const c = CacheService.getScriptCache(), k = 'n_' + Utilities.formatDate(new Date(), TZ, 'yyMMddHH');
  const n = Number(c.get(k) || 0);
  if (n >= 30) {
    if (!c.get(k + '_a')) {   // 막혔다는 사실을 시간당 한 번 담당자에게 알림 (실제 입사자가 막혔을 수 있음)
      c.put(k + '_a', '1', 3700);
      try { MailApp.sendEmail(NOTIFY, '[오류][' + LABEL[CORP] + '] 입사예정자 신청 시간당 한도 초과', '지난 1시간 신청이 30건을 넘어 추가 신청을 잠시 막고 있어요. 다음 시간에 자동으로 풀려요.\n' + SHEET_URL); } catch (e) { console.warn(e); }
    }
    return false;
  }
  c.put(k, String(n + 1), 3700);
  return true;
}
function trapAlert_(d) {
  const c = CacheService.getScriptCache(), k = 't_' + Utilities.formatDate(new Date(), TZ, 'yyMMddHH');
  const n = Number(c.get(k) || 0);
  if (n >= 5) return;
  c.put(k, String(n + 1), 3700);
  try {
    MailApp.sendEmail(NOTIFY, '[확인][' + LABEL[CORP] + '] 숨김 칸이 채워진 입사예정자 신청', '봇일 가능성이 높아 시트에 넣지 않았어요. 실제 입사자로 보이면 승인 시트에 직접 넣어 주세요.\n\n이름: ' + clean_(d.ko, 30) + ' (' + clean_(d.en, 60) + ')\n이미지: ' + clean_(d.image, 120));
  } catch (e) { console.warn(e); }
}
function clean_(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }
function guard_(v) { return /^[=+@\-]/.test(v) ? "'" + v : v; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
