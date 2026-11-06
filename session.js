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

  // ---- 상단 메뉴 ----
  window.renderNav = function (active) {
    var s = window.getStudent();
    var items = [['index.html', '🏠 홈', 'home'], ['pick.html', '📌 주제', 'pick'], ['my.html', '📝 내 발표', 'my'], ['board.html', '👀 현황', 'board'], ['rubric.html', '📋 평가기준', 'rubric']];
    if (s && s.isTeacher) items = items.filter(function (i) { return i[2] !== 'pick' && i[2] !== 'my'; });
    var el = document.getElementById('nav');
    if (!el) return;
    el.innerHTML = items.map(function (i) {
      return '<a href="' + i[0] + '"' + (i[2] === active ? ' class="on"' : '') + '>' + i[1] + '</a>';
    }).join('');
  };
})();
