// 중3 과학 발표회 — 로그인 세션 + 공용 함수
(function () {
  var KEY = 'sciPresAuth';
  var DB_URL = 'https://gwangsu-on-default-rtdb.firebaseio.com';
  window.DB_URL = DB_URL;
  window.TEACHER_ID = '3000';
  window.TEACHER_NAME = '김병선';

  window.getStudent = function () {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return d && d.id && d.name ? d : null;
    } catch (e) { return null; }
  };
  window.setStudent = function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  window.clearStudent = function () { try { localStorage.removeItem(KEY); } catch (e) {} };
  window.requireLogin = function () {
    var s = window.getStudent();
    if (!s) { location.href = 'index.html'; return null; }
    return s;
  };
  window.whoLabel = function (s) {
    if (s.isTeacher) return s.name + ' 선생님';
    return s.grade + '학년 ' + s.ban + '반 ' + s.num + '번 ' + s.name;
  };
  window.esc = function (t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ---- Firebase REST ----
  var cfgCache = null;
  window.getCfg = async function () {
    if (cfgCache) return cfgCache;
    var r = await fetch(DB_URL + '/config/current.json');
    if (!r.ok) throw new Error('설정을 불러오지 못했어요.');
    cfgCache = (await r.json()) || { year: new Date().getFullYear(), sem: 1 };
    return cfgCache;
  };
  window.dbGet = async function (path) {
    var r = await fetch(DB_URL + '/' + path + '.json');
    if (!r.ok) throw new Error('데이터를 불러오지 못했어요.');
    return r.json();
  };
  window.dbPut = async function (path, obj) {
    var r = await fetch(DB_URL + '/' + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });
    if (!r.ok) throw new Error('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    return r.json();
  };
  window.dbDel = async function (path) {
    var r = await fetch(DB_URL + '/' + path + '.json', { method: 'DELETE' });
    if (!r.ok) throw new Error('삭제에 실패했어요.');
  };
  window.basePath = async function () { return 'years/' + (await getCfg()).year + '/sciPres'; };

  // ---- 주제 선택 이력(picksLog) · 복원 ----
  // picksLog/{학번}/{ts} 는 append-only. 선택 취소 시엔 {cancel:true} 기록을 추가로 남김.
  window.PICK_FIELDS = ['kind', 'no', 'unit', 'kw', 'topic'];
  window.logPick = async function (base, id, rec) {
    try { await window.dbPut(base + '/picksLog/' + id + '/' + rec.ts, rec); } catch (e) {}
  };
  window.logPickCancel = function (base, id, by) {
    var ts = Date.now();
    return window.logPick(base, id, { cancel: true, by: by || 'student', ts: ts });
  };
  // picksLog(학생 1명분 객체)와 scripts 레코드(pickSnap)로 가장 최근 선택을 추정. 마지막 기록이 취소면 null.
  window.pickCandidate = function (log, sc) {
    var best = null;
    Object.keys(log || {}).forEach(function (k) {
      var e = log[k]; if (!e) return;
      var ts = Number(e.ts || k) || 0;
      if (!best || ts >= best.ts) best = { ts: ts, e: e, src: 'log' };
    });
    if (sc && sc.pickSnap && sc.pickSnap.topic) {
      var st = Number(sc.updatedAt) || 0;
      if (!best || st > best.ts) best = { ts: st, e: sc.pickSnap, src: 'snap' };
    }
    if (!best || best.e.cancel || !best.e.topic) return null;
    var c = { src: best.src, ts: best.ts };
    window.PICK_FIELDS.forEach(function (f) { c[f] = best.e[f] == null ? null : best.e[f]; });
    return c;
  };
  // 후보로 picks 레코드를 다시 만들어 저장(+이력 추가). s: {id,grade,ban,num,name}
  window.restorePick = async function (base, s, cand) {
    var rec = { id: s.id, grade: s.grade, ban: s.ban, num: s.num, name: s.name, ts: Date.now(), restored: true };
    window.PICK_FIELDS.forEach(function (f) { rec[f] = cand[f] == null ? null : cand[f]; });
    await window.dbPut(base + '/picks/' + s.id, rec);
    await window.logPick(base, s.id, rec);
    return rec;
  };
  // 학생 화면용 복원 안내 카드
  window.restoreCardHtml = function (c, btnOnclick) {
    return '<div class="card topic-card" style="padding:16px;border:2px dashed #ffc078;background:#fff9f0">' +
      '<b style="font-size:.9rem">선택 기록이 없어요. 아래 주제가 맞나요?</b>' +
      '<div class="tc-top" style="margin-top:8px"><span class="tag ' + (c.unit === '별과 우주' ? 'a' : 'b') + '">' + window.esc(c.unit) + '</span>' +
      (c.kind === 'custom' ? '<span class="tag" style="background:#f3e8ff;color:#7b2cbf">직접 작성</span>' : '') + '</div>' +
      '<div class="chips">' + String(c.kw || '').split(',').filter(function (k) { return k.trim(); }).map(function (k) { return '<span class="chip">' + window.esc(k.trim()) + '</span>'; }).join('') + '</div>' +
      '<div class="tc-topic">' + window.esc(c.topic) + '</div>' +
      '<button class="btn small" id="restoreBtn" style="margin-top:10px;width:100%" onclick="' + btnOnclick + '">이 주제로 복원</button>' +
      '<div class="small-note">다른 주제였다면 복원하지 말고 새로 골라 주세요.</div></div>';
  };

  // ---- 페이지 이동 링크에 빌드 번호를 붙여 오래된 캐시 페이지가 뜨지 않게 함 ----
  var BUILD = '15';
  window.bustLinks = function () {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^[a-z]+\.html$/.test(h)) a.setAttribute('href', h + '?v=' + BUILD);
    });
  };
  document.addEventListener('DOMContentLoaded', window.bustLinks);

  // ---- 상단 메뉴 ----
  window.renderNav = function (active) {
    var s = window.getStudent();
    var items = [['index.html', '🏠 홈', 'home'], ['pick.html', '📌 주제', 'pick'], ['my.html', '📝 내 발표', 'my'], ['board.html', '👀 현황', 'board'], ['peer.html', '🗣️ 청취자 평가', 'peer'], ['rubric.html', '📋 평가기준', 'rubric'], ['concepts.html', '📖 기본 개념', 'concepts']];
    if (s && s.isTeacher) items = items.filter(function (i) { return i[2] !== 'pick' && i[2] !== 'my' && i[2] !== 'peer'; });
    var el = document.getElementById('nav');
    if (!el) return;
    el.innerHTML = items.map(function (i) {
      return '<a href="' + i[0] + '"' + (i[2] === active ? ' class="on"' : '') + '>' + i[1] + '</a>';
    }).join('');
    window.bustLinks();
  };
})();
