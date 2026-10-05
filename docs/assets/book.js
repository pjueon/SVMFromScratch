/* 학습 교재 런타임 — textbook-html 스킬 동봉본
   - 외부 의존 없음. file:// 로 열려도 동작한다 (fetch / module script 미사용)
   - 담당: 목차 사이드바, 화면 넘김, 진행률, 퀴즈 채점, Before/After 탭,
           용어 툴팁, 화면 참조 링크(미리보기·돌아가기), 코드 하이라이팅, 진도 저장
   - 교재마다 고쳐야 하는 곳은 아래 [교재별] 다섯 블록뿐이다. 그 밖은 손대지 않는다. */
(function () {
  'use strict';

  /* ── [교재별 1/5] 교재 제목 — 사이드바 머리와 표지에 쓰인다 ──── */
  var TITLE = 'SVM 밑바닥부터';
  var SUBTITLE = '마진·쌍대문제·커널 트릭을 손으로 풀어 보는 서포트 벡터 머신';

  /* ── [교재별 2/5] 책 전체 목차 — 모든 페이지가 공유하는 단일 진실 원천 ──
        커리큘럼이 확정되면 이 배열을 그대로 옮겨 적는다.
        screens/hours 는 커리큘럼의 값. part 는 사이드바의 묶음 제목.
        ready:true 인 장만 링크가 되고 "이어서 읽기" 대상이 된다 —
        집필 전 장은 ready 를 빼 두면 목차에 회색으로 남는다. */
  var BOOK = [
    { id: 'ch01', num: '1장', title: '점들을 가르는 직선', part: '1부 · 직선과 마진', screens: 5, hours: 0.8, ready: true },
    { id: 'ch02', num: '2장', title: '마진과 하드 마진 SVM', part: '1부 · 직선과 마진', screens: 6, hours: 1.0, ready: true },
    { id: 'ch03', num: '3장', title: '제약 있는 최적화 기초 (라그랑주·KKT)', part: '2부 · 최적화와 쌍대', screens: 6, hours: 1.0, ready: true },
    { id: 'ch04', num: '4장', title: '쌍대문제 유도', part: '2부 · 최적화와 쌍대', screens: 8, hours: 1.3, ready: true },
    { id: 'ch05', num: '5장', title: '소프트 마진', part: '3부 · 현실로 넓히기', screens: 5, hours: 0.8 },
    { id: 'ch06', num: '6장', title: '커널 트릭', part: '3부 · 현실로 넓히기', screens: 8, hours: 1.3 },
    { id: 'ch07', num: '7장', title: '밑바닥부터 구현 (NumPy, SMO)', part: '4부 · 구현과 실전', screens: 6, hours: 1.0 },
    { id: 'ch08', num: '8장', title: '실전: scikit-learn 과 SVM 의 자리', part: '4부 · 구현과 실전', screens: 4, hours: 0.7 }
  ];

  /* ── [교재별 3/5] 용어집 — 툴팁의 원천 ────────────────────────
        본문의 <span class="term" data-term="키">낱말</span> 이 이 표에서 뜻을 찾는다.
        표에 없는 키를 쓰면 툴팁이 조용히 안 나온다(점검 절차의 termsMissing 이 잡는다).
        _smoke 항목은 _smoke.html 이 참조하므로 지우지 않는다. */
  var TERMS = {
    _smoke: '스모크 점검용 항목 — 이 줄은 지우지 않는다.',
    classification: '분류 — 입력(점)이 미리 정해진 범주 중 어디에 속하는지 맞히는 문제. 값(숫자)을 맞히는 회귀와는 다르다.',
    label: '레이블 — 학습용 점마다 붙어 있는 정답표. 이 교재에서는 파랑 = +1, 빨강 = −1 로 쓴다.',
    feature: '특성 — 점 하나를 설명하는 숫자 하나하나. 평면 위의 점이라면 가로 좌표 x₁ 과 세로 좌표 x₂ 가 두 특성이다.',
    traindata: '학습 데이터 — 정답(레이블)을 알고 있어서 분류기를 만드는 데 쓰는 점들. 새 점은 여기에 없는 점이다.',
    boundary: '결정경계 — 분류기가 점들을 두 범주로 나누는 경계. 선형 분류기에서는 초평면 w·x+b=0 그 자체다.',
    hyperplane: '초평면 — w·x+b=0 을 만족하는 점들의 집합. 2차원에서는 직선, 3차원에서는 평면이고, 그 위 차원에서도 같은 식으로 쓴다.',
    dot: '내적 — 같은 자리의 숫자끼리 곱해 더한 값. 두 벡터가 같은 방향이면 크고, 수직이면 0, 반대 방향이면 음수.',
    norm: '노름 ||w|| — 벡터의 길이. w=(w₁,w₂) 이면 √(w₁²+w₂²).',
    normal: '법선 벡터 — 직선(또는 평면)에 수직인 방향의 벡터.',
    perceptron: '퍼셉트론 — 점들을 가르는 직선을 하나 찾아 주는 오래된 학습법. 가르기만 하면 멈추기 때문에 어떤 직선이 나올지는 시작값과 점 순서에 달려 있다.',
    sign: '부호 함수 sign — 양수면 +1, 음수면 −1 을 돌려주는 함수.',
    margin: '마진 — 직선에서 가장 가까운 점까지 거리의 두 배. 직선 양쪽으로 나란히 띠를 넓혀 점에 처음 닿을 때까지의 띠의 폭. (크기를 못 박은 뒤에는 2/||w||)',
    funcmargin: '함수 마진 — 점 하나에 대한 y·(w·x+b) 의 값. 맞게 분류했으면 양수이고, (w, b) 를 k 배 하면 k 배가 되므로 직선까지의 거리는 아니다.',
    geomargin: '기하 마진 — 직선까지의 실제 거리로 잰 여유. (w, b) 의 크기와 무관하다. 이 교재에서 그냥 마진이라 하면 이것이다.',
    objective: '목적함수 — 최적화에서 가장 작게(또는 크게) 만들고 싶은 값. SVM 에서는 ½||w||².',
    constraint: '제약 조건 — 최적화에서 반드시 지켜야 하는 조건. SVM 에서는 점마다 y(w·x+b) ≥ 1 이 하나씩 있다.',
    feasible: '가능해 — 모든 제약 조건을 한꺼번에 만족하는 (w, b). 가능해 중에서 목적함수가 가장 작은 것이 답이다.',
    hardmargin: '하드 마진 — 모든 점이 예외 없이 올바른 쪽, 띠 바깥에 있어야 한다고 요구하는 SVM. 직선으로 가를 수 없는 데이터에는 답이 없다.',
    partial: '편미분 ∂J/∂w₁ — 다른 변수는 상수로 얼려 두고 w₁ 하나만 조금 움직일 때 J 가 변하는 비율. 변수가 하나일 때의 d 와 구분하려고 ∂ 를 쓴다.',
    gradient: '기울기 벡터 ∇J (나블라 J) — 편미분을 성분으로 모은 벡터 (∂J/∂w₁, ∂J/∂w₂). J 가 가장 빨리 오르는 방향을 가리키고, 등고선에 수직이다.',
    contour: '등고선 — 함수 값이 같은 점들을 이은 곡선. ½(w₁²+w₂²) 의 등고선은 원점을 중심으로 한 원이고, 값이 클수록 큰 원이다.',
    lagrangian: '라그랑지안 L = J − λ·g — 목적함수에서 제약식에 승수 λ 를 곱한 것을 뺀 함수. 모든 변수로 편미분해 0 으로 놓으면 제약 있는 문제의 후보 점이 나온다.',
    active: '활성 제약 — 최적해에서 g = 0 으로 경계에 딱 닿아 답을 밀고 있는 제약. 승수 λ 는 0 이 아닐 수 있다(보통 λ > 0).',
    inactive: '비활성 제약 — 최적해에서 g > 0 으로 여유가 있어 답에 영향이 없는 제약. 승수는 λ = 0 이다.',
    kkt: 'KKT 조건 — 부등식 제약이 있는 최적화의 답이 만족하는 네 줄: 정상성, 원문제 가능성, 쌍대 가능성, 상보 여유성. Karush–Kuhn–Tucker 의 머리글자.',
    stationarity: '정상성 — ∇_w L = 0. 라그랑지안을 변수 w 로 편미분한 것이 0, 곧 ∇J = Σ λᵢ∇gᵢ. 목적함수의 기울기와 제약이 미는 힘이 맞선다.',
    primalfeas: '원문제 가능성 — 답이 원래 문제의 모든 제약 gᵢ(w) ≥ 0 을 지킨다는 조건.',
    dualfeas: '쌍대 가능성 — 승수가 λᵢ ≥ 0 이라는 조건. 쌍대문제의 가능해가 되려면 지켜야 하는 조건이라서 붙은 이름이다(4장 화면 5).',
    compslack: '상보 여유성 — 모든 제약에서 λᵢ·gᵢ(w) = 0. 제약마다 승수 λ 와 여유 g 중 하나는 반드시 0 이다.',
    primal: '원문제 — 원래 형태의 문제. SVM 에서는 w, b 를 변수로 하는 min ½||w||², s.t. y(w·x+b) ≥ 1 (점마다 하나).',
    dual: '쌍대문제 — 같은 라그랑지안에서 w, b 를 없애고 α 만 변수로 남긴 문제. 원문제의 하한 가운데 가장 높은 것을 찾는 max 문제이고, 원문제와 짝을 이룬다.',
    sigma: 'Σ (시그마) — i 를 1 부터 n 까지 바꿔 가며 뒤의 식을 전부 더하라는 기호. Σ a⁽ⁱ⁾ = a⁽¹⁾ + a⁽²⁾ + … + a⁽ⁿ⁾.',
    doublesum: '이중합 ΣΣ — 합이 두 겹. 바깥 i 를 하나 고정하고 안쪽 j 를 끝까지 돌려 더한 뒤, i 를 바꿔 가며 다시 더한다. 점이 n 개면 n×n 개의 항이 생긴다.',
    weakdual: '약쌍대성 — 아무 α ≥ 0 에 대한 쌍대 목적값 D(α) 는 원문제의 어떤 가능한 값보다도 크지 않다는 사실. 쌍대 목적값은 원문제 최솟값의 하한이다.',
    strongdual: '강쌍대성 — 하한의 최댓값이 원문제 최솟값과 정확히 같다는 성질. 이 교재의 문제(볼록 이차계획 + 선형 제약)에서는 성립한다(증명은 생략, Boyd & Vandenberghe 5장).',
    supportvector: '서포트 벡터 — 쌍대문제의 답에서 α⁽ⁱ⁾ > 0 인 점. 상보 여유성에 의해 반드시 마진 경계 위에 있고, w 는 이 점들로만 만들어진다.'
  };

  /* ── [교재별 4/5] 진도 저장 키 — 교재 슬러그를 접두어로 둔다 ─────
        file:// 에서는 로컬로 열린 모든 페이지가 저장소를 공유하므로,
        접두어가 겹치면 다른 교재의 진도를 덮어쓴다. 아래 세 키의 접두어를 함께 바꾼다. */
  var STORE_KEY = 'svm-book:progress';
  var NAV_KEY = 'svm-book:nav';     // '다음 장'으로 넘어왔는지 (sessionStorage)
  var BACK_KEY = 'svm-book:back';   // 다른 장의 참조 링크를 누른 자리 (sessionStorage)

  /* ── 진도 저장 (file:// 에서는 모든 로컬 페이지가 저장소를 공유하므로
        키에 반드시 접두어를 붙인다) ──────────────────────────────── */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* 저장 못해도 교재는 동작한다 */ }
  }

  /* ── [교재별 5/5] 코드 하이라이터 키워드 ──────────────────────
        기본은 Python. 다른 언어면 이 목록만 교체한다.
        한 교재에 언어가 둘이면 합집합으로 둔다 — 오탐이 조금 늘지만 충분하다.
        주석·문자열 표기 자체가 다른 언어(슬래시 두 개로 주석을 여는 계열 등)는
        아래 PY_RE 의 첫 두 그룹도 함께 고쳐야 한다. */
  var PY_KW = 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|' +
              'else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|' +
              'pass|raise|return|try|while|with|yield|match|case';

  var PY_RE = new RegExp(
    '(#[^\\n]*)' +
    '|([fFrRbBuU]{0,2}(?:"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'))' +
    '|(@[A-Za-z_][\\w.]*)' +
    '|\\b(def|class)(\\s+)([A-Za-z_]\\w*)' +
    '|\\b(self|cls)\\b' +
    '|\\b(' + PY_KW + ')\\b' +
    '|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b',
    'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightPython(src) {
    return esc(src).replace(PY_RE, function (m, com, str, dec, defkw, gap, name, slf, kw, num) {
      if (com) return '<span class="tok-com">' + com + '</span>';
      if (str) return '<span class="tok-str">' + str + '</span>';
      if (dec) return '<span class="tok-dec">' + dec + '</span>';
      if (defkw) return '<span class="tok-kw">' + defkw + '</span>' + gap + '<span class="tok-fn">' + name + '</span>';
      if (slf) return '<span class="tok-self">' + slf + '</span>';
      if (kw) return '<span class="tok-kw">' + kw + '</span>';
      if (num) return '<span class="tok-num">' + num + '</span>';
      return m;
    });
  }

  /* code 안의 텍스트 노드만 색칠한다. 저자가 직접 넣은 <b class="hl"> 같은
     강조 표시를 지우지 않기 위한 방식. */
  function highlightAll(root) {
    var blocks = root.querySelectorAll('pre > code, pre code.python');
    Array.prototype.forEach.call(blocks, function (code) {
      if (code.dataset.hl === 'done' || code.classList.contains('plain')) return;
      var texts = [];
      var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) texts.push(walker.currentNode);
      texts.forEach(function (t) {
        var span = document.createElement('span');
        span.innerHTML = highlightPython(t.nodeValue);
        t.parentNode.replaceChild(span, t);
      });
      code.dataset.hl = 'done';
    });
  }

  /* ── 용어 툴팁 ──────────────────────────────────────────────── */
  function initTerms(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.term[data-term]'), function (el) {
      var def = TERMS[el.dataset.term];
      if (!def) return;
      el.setAttribute('data-def', def);
      el.setAttribute('tabindex', '0');
    });
  }

  /* 말풍선은 body 에 하나만 두고 화면 안에 들어오게 자리를 잡는다.
     마우스를 올리거나, 탭(포커스)하면 뜨고, 벗어나거나 Esc 를 누르면 닫힌다. */
  var tip = null, tipFor = null;
  function showTip(el) {
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    tip.textContent = el.getAttribute('data-def');
    tip.classList.add('on');
    tipFor = el;
    var r = el.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.max(8, Math.min(r.left, vw - w - 8));
    var top = r.bottom + 6;
    if (top + h > vh - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() {
    if (tip) tip.classList.remove('on');
    tipFor = null;
  }
  function initTip() {
    function termOf(e) { return e.target.closest ? e.target.closest('.term[data-def]') : null; }
    document.addEventListener('mouseover', function (e) { var t = termOf(e); if (t) showTip(t); });
    document.addEventListener('mouseout', function (e) {
      var t = termOf(e);
      if (t && t === tipFor && !t.contains(e.relatedTarget) && document.activeElement !== t) hideTip();
    });
    document.addEventListener('focusin', function (e) { var t = termOf(e); if (t) showTip(t); });
    document.addEventListener('focusout', function (e) { if (termOf(e) === tipFor) hideTip(); });
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);
  }

  /* ── 화면 참조 링크 ──────────────────────────────────────────────
     본문 텍스트에서 "N장 화면 M", "화면 N" 을 찾아 링크로 바꾼다(마크업 불필요).
     코드, 이미 링크인 곳, kicker, 그림 안은 건드리지 않는다.
     링크로 만들고 싶지 않은 자리는 <code> 로 감싸면 건너뛴다. */
  var REF_RE = /(\d{1,2})장 화면 (\d{1,2})((?:\s?[·,~]\s?\d{1,2})*)|화면 (\d{1,2})(?!\d|개|화면)((?:\s?[·,~]\s?\d{1,2})*)/g;
  var SKIP_SEL = 'pre, code, a, button, svg, .kicker, .term, .cap, script, style, #tip, #xpop';

  function chapterOf(num) {
    var id = 'ch' + (num < 10 ? '0' : '') + num;
    for (var i = 0; i < BOOK.length; i++) if (BOOK[i].id === id && BOOK[i].ready) return BOOK[i];
    return null;
  }

  function linkRefs(root, chId, screenCount) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !/화면 \d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return n.parentNode.closest(SKIP_SEL) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var text = node.nodeValue, frag = document.createDocumentFragment(), last = 0, m, changed = false;
      REF_RE.lastIndex = 0;
      function put(s) { if (s) frag.appendChild(document.createTextNode(s)); }
      // "화면 4·6", "4장 화면 2~3" 처럼 이어지는 번호도 하나씩 링크로 만든다
      function putList(prefix, first, tail, make) {
        var a = make(parseInt(first, 10), prefix + first);
        if (!a) return false;
        frag.appendChild(a);
        var re = /(\s?[·,~]\s?)(\d{1,2})/g, t;
        while ((t = re.exec(tail))) {
          put(t[1]);
          var b = make(parseInt(t[2], 10), t[2]);
          if (b) frag.appendChild(b); else put(t[2]);
        }
        return true;
      }
      while ((m = REF_RE.exec(text))) {
        var start = m.index;
        if (m[1]) {
          var ch = chapterOf(parseInt(m[1], 10));
          if (!ch) continue;
          put(text.slice(last, start));
          var sameCh = ch.id === chId;
          putList(m[1] + '장 화면 ', m[2], m[3] || '', function (n, label) {
            if (n < 1 || n > ch.screens) return null;
            return sameCh ? makeXref(n, label) : makeChRef(ch, n, label);
          });
        } else {
          if (!screenCount) continue;
          put(text.slice(last, start));
          if (!putList('화면 ', m[4], m[5] || '', function (n, label) {
            return (n >= 1 && n <= screenCount) ? makeXref(n, label) : null;
          })) put(m[0]);
        }
        last = REF_RE.lastIndex;
        changed = true;
      }
      if (!changed) return;
      put(text.slice(last));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function makeXref(n, label) {
    var a = document.createElement('a');
    a.className = 'xref';
    a.href = '#s' + n;
    a.setAttribute('data-screen', n);
    a.textContent = label;
    return a;
  }
  function makeChRef(ch, n, label) {
    var a = document.createElement('a');
    a.className = 'xref xref-ch';
    a.href = ch.id + '.html#s' + n;
    a.textContent = label;
    a.title = ch.num + ' 화면 ' + n + '(으)로 이동합니다';
    return a;
  }

  /* ── Before / After 탭 ──────────────────────────────────────── */
  function initTabs(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.tabs'), function (wrap) {
      if (wrap.dataset.init) return;
      var tabs = wrap.querySelectorAll(':scope > .tab');
      if (!tabs.length) return;
      var bar = document.createElement('div');
      bar.className = 'tabbar';
      Array.prototype.forEach.call(tabs, function (tab, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = tab.dataset.label || ('탭 ' + (i + 1));
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(bar.children, function (x, j) { x.classList.toggle('on', i === j); });
          Array.prototype.forEach.call(tabs, function (x, j) { x.classList.toggle('on', i === j); });
        });
        bar.appendChild(b);
        tab.classList.toggle('on', i === 0);
      });
      bar.children[0].classList.add('on');
      wrap.insertBefore(bar, wrap.firstChild);
      wrap.dataset.init = '1';
    });
  }

  /* ── 퀴즈 ───────────────────────────────────────────────────── */
  function initQuiz(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.quiz'), function (quiz, qi) {
      if (quiz.dataset.init) return;
      var answer = parseInt(quiz.dataset.answer, 10);
      var opts = quiz.querySelectorAll('ol.options > li');

      var qn = quiz.querySelector('.qn');
      if (!qn) {
        qn = document.createElement('p');
        qn.className = 'qn';
        qn.textContent = '퀴즈 ' + (qi + 1);
        quiz.insertBefore(qn, quiz.firstChild);
      }

      Array.prototype.forEach.call(opts, function (li, i) {
        if (li.dataset.why) {
          var why = document.createElement('div');
          why.className = 'why';
          why.textContent = li.dataset.why;
          li.appendChild(why);
        }
        // 키보드로도 고를 수 있게 한다(Tab 으로 옮기고 Enter·Space 로 고른다)
        li.setAttribute('tabindex', '0');
        li.setAttribute('role', 'button');
        li.addEventListener('keydown', function (e) {
          if (e.target !== li) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
        });
        li.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('a, .term')) return;
          if (quiz.classList.contains('done')) return;
          var picked = i + 1;
          li.classList.add('picked', picked === answer ? 'pick-good' : 'pick-bad');
          if (picked !== answer && opts[answer - 1]) {
            opts[answer - 1].classList.add('pick-good', 'picked');
          }
          quiz.classList.add('done');
        });
      });
      quiz.dataset.init = '1';
    });
  }

  /* ── 목차 사이드바 ──────────────────────────────────────────── */
  function buildSidebar(currentId, screenTitles, onJump) {
    var progress = loadProgress();
    var toc = document.createElement('nav');
    toc.id = 'toc';

    var brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'index.html';
    brand.innerHTML = '<b>' + TITLE + '</b><span>' + SUBTITLE + '</span>';
    toc.appendChild(brand);

    var lastPart = null;
    BOOK.forEach(function (ch) {
      if (ch.part !== lastPart) {
        lastPart = ch.part;
        var p = document.createElement('div');
        p.className = 'part';
        p.textContent = ch.part;
        toc.appendChild(p);
      }
      var done = progress[ch.id] && progress[ch.id].done;
      var label = '<em>' + ch.num + (done ? ' <span class="tick">✓</span>' : '') + '</em>' + ch.title;
      var node;
      if (ch.ready) {
        node = document.createElement('a');
        node.className = 'ch';
        node.href = ch.id + '.html';
      } else {
        node = document.createElement('span');
        node.className = 'ch';
        node.title = '아직 집필 전입니다';
      }
      node.innerHTML = label;
      toc.appendChild(node);

      if (ch.id === currentId) {
        node.classList.add('here');
        if (screenTitles && screenTitles.length) {
          var ol = document.createElement('ol');
          ol.className = 'screens';
          screenTitles.forEach(function (t, i) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = (i + 1) + '. ' + t;
            b.addEventListener('click', function () { onJump(i); });
            li.appendChild(b);
            ol.appendChild(li);
          });
          toc.appendChild(ol);
        }
      }
    });

    document.body.appendChild(toc);

    var toggle = document.createElement('button');
    toggle.id = 'toc-toggle';
    toggle.type = 'button';
    toggle.textContent = '☰';
    toggle.setAttribute('aria-label', '목차 열기');
    toggle.addEventListener('click', function () { document.body.classList.toggle('toc-open'); });
    document.body.appendChild(toggle);

    // 모바일에서 목차를 열면 본문을 막으로 덮고, 막을 누르면 닫는다
    var scrim = document.createElement('div');
    scrim.id = 'toc-scrim';
    scrim.addEventListener('click', function () { document.body.classList.remove('toc-open'); });
    document.body.appendChild(scrim);

    return toc;
  }

  /* ── 장 페이지 초기화 ───────────────────────────────────────── */
  function initChapter() {
    var chId = document.documentElement.dataset.chapter;
    var idx = -1;
    BOOK.forEach(function (c, i) { if (c.id === chId) idx = i; });
    var meta = BOOK[idx] || { num: '', title: document.title };

    var book = document.getElementById('book');
    var screens = book.querySelectorAll('.screen');
    if (!screens.length) return;

    var titles = Array.prototype.map.call(screens, function (s, i) {
      return s.dataset.title || (i + 1) + '번째 화면';
    });

    var cur = 0;

    var bar = document.createElement('div');
    bar.id = 'progress';
    bar.innerHTML = '<i></i>';
    document.body.appendChild(bar);
    var fill = bar.firstChild;

    var nav = document.createElement('div');
    nav.id = 'nav';
    nav.innerHTML =
      '<button type="button" id="prev">← 이전</button>' +
      '<div class="where"><b>' + meta.num + '</b> · 화면 <b class="cnt"></b></div>' +
      '<button type="button" id="next">다음 →</button>';
    document.body.appendChild(nav);

    var prevBtn = nav.querySelector('#prev');
    var nextBtn = nav.querySelector('#next');
    var cnt = nav.querySelector('.cnt');

    var toc = buildSidebar(chId, titles, function (i) {
      show(i);
      document.body.classList.remove('toc-open');
    });
    var screenItems = toc.querySelectorAll('ol.screens > li');

    function neighbourReady(step) {
      var j = idx + step;
      while (j >= 0 && j < BOOK.length) {
        if (BOOK[j].ready) return BOOK[j];
        j += step;
      }
      return null;
    }
    var prevCh = neighbourReady(-1);
    var nextCh = neighbourReady(1);

    // writeLast=false 이면 이 장의 진도만 남기고 '이어서 읽기' 기준점은 건드리지 않는다.
    // (#s5 같은 딥링크로 특정 화면만 열어볼 때 기준점이 그리로 끌려가는 것을 막는다)
    // 완독(✓)은 직전 화면에서 '다음'으로 마지막 화면에 왔을 때만 남긴다.
    function remember(writeLast, finished) {
      var p = loadProgress();
      var rec = p[chId] || {};
      rec.screen = cur;
      if (finished && cur === screens.length - 1) rec.done = true;
      p[chId] = rec;
      if (writeLast) p['_last'] = { id: chId, screen: cur };
      saveProgress(p);
    }

    // 주소의 #sN 을 지금 화면에 맞춰 두면 새로고침·북마크가 그 화면으로 돌아온다.
    // push=true 이면 기록을 하나 쌓아 브라우저의 뒤로 가기로 돌아올 수 있게 한다.
    function setHash(push) {
      var h = '#s' + (cur + 1);
      try {
        if (push) history.pushState(null, '', h);
        else if (location.hash !== h) history.replaceState(null, '', h);
      } catch (e) { /* file:// 에서 막히는 브라우저가 있어도 화면 넘김은 동작한다 */ }
    }

    function show(i, silentLast, finished, push) {
      cur = Math.max(0, Math.min(screens.length - 1, i));
      Array.prototype.forEach.call(screens, function (s, j) {
        s.classList.toggle('is-active', j === cur);
      });
      Array.prototype.forEach.call(screenItems, function (li, j) {
        li.classList.toggle('on', j === cur);
      });
      cnt.textContent = (cur + 1) + ' / ' + screens.length;
      fill.style.width = ((cur + 1) / screens.length * 100) + '%';

      prevBtn.disabled = (cur === 0 && !prevCh);
      nextBtn.disabled = (cur === screens.length - 1 && !nextCh);
      prevBtn.textContent = (cur === 0 && prevCh) ? '← ' + prevCh.num : '← 이전';
      nextBtn.textContent = (cur === screens.length - 1 && nextCh) ? nextCh.num + ' →' : '다음 →';

      // 사이드바의 현재 화면 항목이 목차 밖으로 밀려나 있으면 보이게 굴린다(본문은 굴리지 않는다)
      var on = screenItems[cur];
      if (on) {
        var top = on.offsetTop, bottom = top + on.offsetHeight;
        if (top < toc.scrollTop + 40 || bottom > toc.scrollTop + toc.clientHeight - 40) {
          toc.scrollTop = top - toc.clientHeight / 3;
        }
      }

      hideTip();
      closePop();
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
      setHash(push);
      remember(!silentLast, finished);
    }

    prevBtn.addEventListener('click', function () {
      if (cur === 0) { if (prevCh) location.href = prevCh.id + '.html#last'; return; }
      show(cur - 1);
    });
    nextBtn.addEventListener('click', function () {
      if (cur === screens.length - 1) {
        if (nextCh) {
          // 다음 장은 늘 첫 화면부터 연다. 차례대로 넘어온 것이므로 '이어서 읽기' 기준점도 옮긴다.
          try { sessionStorage.setItem(NAV_KEY, 'seq'); } catch (e) {}
          location.href = nextCh.id + '.html#s1';
        }
        return;
      }
      show(cur + 1, false, cur + 1 === screens.length - 1);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTip(); closePop(); document.body.classList.remove('toc-open'); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat || e.defaultPrevented) return;
      var t = e.target;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('[role=slider]'))) return;
      // PageUp/PageDown 은 긴 화면을 굴리는 데 쓰이므로 가로채지 않는다
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
    });

    highlightAll(book);
    initTerms(book);
    linkRefs(book, chId, screens.length);
    initTabs(book);
    initQuiz(book);
    initTip();

    /* ── 화면 참조: 같은 장이면 미리보기, 이동하면 돌아가기 버튼 ── */
    var pop = null, popTimer = null, popFrom = null;
    function closePop() {
      clearTimeout(popTimer);
      if (pop) pop.classList.remove('on');
      popFrom = null;
    }
    function openPop(a, pinned) {
      var n = parseInt(a.getAttribute('data-screen'), 10);
      var target = screens[n - 1];
      if (!target) return;
      if (!pop) {
        pop = document.createElement('div');
        pop.id = 'xpop';
        pop.setAttribute('role', 'dialog');
        pop.innerHTML = '<div class="xpop-head"><b></b><button type="button" class="go">이 화면으로 이동</button>' +
          '<button type="button" class="x" aria-label="닫기">✕</button></div><div class="xpop-body"></div>';
        document.body.appendChild(pop);
        pop.querySelector('.x').addEventListener('click', closePop);
        pop.querySelector('.go').addEventListener('click', function () { jumpTo(parseInt(pop.dataset.screen, 10)); });
        pop.addEventListener('mouseenter', function () { clearTimeout(popTimer); });
        pop.addEventListener('mouseleave', function () { if (!pop.dataset.pinned) popTimer = setTimeout(closePop, 250); });
      }
      if (n - 1 === cur) return;
      pop.dataset.screen = n;
      pop.dataset.pinned = pinned ? '1' : '';
      pop.querySelector('.xpop-head b').textContent = '화면 ' + n + ' · ' + titles[n - 1];
      var body = pop.querySelector('.xpop-body');
      body.innerHTML = '';
      var clone = target.cloneNode(true);
      clone.classList.add('is-active');
      Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
      body.appendChild(clone);
      body.scrollTop = 0;
      pop.classList.add('on');
      popFrom = a;
      // 링크 아래(자리가 없으면 위)에 띄운다. 좁은 화면에서는 CSS 가 아래쪽 시트로 고정한다.
      var r = a.getBoundingClientRect();
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      var w = pop.offsetWidth, h = pop.offsetHeight;
      var left = Math.max(8, Math.min(r.left, vw - w - 8));
      var top = r.bottom + 8;
      if (top + h > vh - 8) top = Math.max(8, r.top - h - 8);
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
    }

    var back = null;
    function showBack(label, onBack) {
      if (!back) {
        back = document.createElement('div');
        back.id = 'xback';
        back.innerHTML = '<a href="#"></a><button type="button" aria-label="돌아가기 버튼 닫기">✕</button>';
        document.body.appendChild(back);
        back.querySelector('button').addEventListener('click', function () { back.classList.remove('on'); });
      }
      var link = back.querySelector('a');
      link.textContent = '← ' + label + '(으)로 돌아가기';
      link.onclick = function (e) { e.preventDefault(); back.classList.remove('on'); onBack(); };
      back.classList.add('on');
    }

    function jumpTo(n) {
      var from = cur;
      show(n - 1, false, false, true);
      showBack('화면 ' + (from + 1), function () { show(from, false, false, true); });
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.xref');
      if (!a) return;
      if (a.classList.contains('xref-ch')) {
        try { sessionStorage.setItem(BACK_KEY, JSON.stringify({ id: chId, num: meta.num, screen: cur + 1 })); } catch (err) {}
        return;  // 다른 장은 그대로 이동한다
      }
      e.preventDefault();
      e.stopPropagation();
      // 같은 장: 첫 클릭은 미리보기를 고정해서 열고, 미리보기 안의 '이동' 버튼으로 넘어간다
      if (pop && pop.classList.contains('on') && popFrom === a && pop.dataset.pinned) closePop();
      else openPop(a, true);
    }, true);
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('mouseover', function (e) {
        var a = e.target.closest && e.target.closest('a.xref[data-screen]');
        if (!a || a === popFrom) return;
        clearTimeout(popTimer);
        popTimer = setTimeout(function () { openPop(a, false); }, 350);
      });
      document.addEventListener('mouseout', function (e) {
        var a = e.target.closest && e.target.closest('a.xref[data-screen]');
        if (!a || (pop && pop.contains(e.relatedTarget))) return;
        clearTimeout(popTimer);
        if (pop && !pop.dataset.pinned) popTimer = setTimeout(closePop, 250);
      });
    }
    document.addEventListener('mousedown', function (e) {
      if (pop && pop.classList.contains('on') && !pop.contains(e.target) && !(e.target.closest && e.target.closest('a.xref'))) closePop();
    });

    // 브라우저의 뒤로/앞으로 가기로 #sN 이 바뀌면 그 화면을 보인다
    window.addEventListener('popstate', function () {
      var m = /^#s(\d+)$/.exec(location.hash);
      if (m) show(parseInt(m[1], 10) - 1);
      if (back) back.classList.remove('on');
    });
    window.addEventListener('hashchange', function () {
      var m = /^#s(\d+)$/.exec(location.hash);
      if (m && parseInt(m[1], 10) - 1 !== cur) show(parseInt(m[1], 10) - 1);
    });
    window.addEventListener('beforeprint', function () {
      Array.prototype.forEach.call(document.querySelectorAll('details.fold'), function (d) { d.open = true; });
    });

    // 시작 화면 결정: #last → 마지막, #s3 → 3번째, 그 외에는 저장된 진도
    var start = 0;
    var hash = location.hash;
    var seq = false;
    try { seq = sessionStorage.getItem(NAV_KEY) === 'seq'; sessionStorage.removeItem(NAV_KEY); } catch (e) {}
    if (hash === '#last') {
      start = screens.length - 1;
    } else if (/^#s\d+$/.test(hash)) {
      start = parseInt(hash.slice(2), 10) - 1;
    } else {
      var saved = loadProgress()[chId];
      if (saved && typeof saved.screen === 'number') start = saved.screen;
    }
    show(start, !!hash && !seq);

    // 다른 장의 참조 링크로 왔으면 원래 자리로 돌아가는 버튼을 띄운다
    try {
      var from = JSON.parse(sessionStorage.getItem(BACK_KEY) || 'null');
      sessionStorage.removeItem(BACK_KEY);
      if (from && from.id !== chId) {
        showBack(from.num + ' 화면 ' + from.screen, function () { location.href = from.id + '.html#s' + from.screen; });
      }
    } catch (e) {}
  }

  /* ── 표지(index.html) 초기화 ────────────────────────────────── */
  function initCover() {
    var progress = loadProgress();
    var list = document.getElementById('toc-list');
    if (list) {
      var lastPart = null;
      BOOK.forEach(function (ch) {
        if (ch.part !== lastPart) {
          lastPart = ch.part;
          var h = document.createElement('div');
          h.className = 'parts';
          h.textContent = ch.part;
          list.appendChild(h);
        }
        var li = document.createElement('li');
        var done = progress[ch.id] && progress[ch.id].done;
        var meta = ch.hours ? (ch.screens + '화면 · ' + ch.hours + '시간') : '';
        var inner =
          '<span class="n">' + ch.num + '</span>' +
          '<span class="t">' + ch.title + (done ? ' <span class="tick">✓</span>' : '') + '</span>' +
          '<span class="meta">' + (ch.ready ? meta : '집필 예정') + '</span>';
        if (ch.ready) {
          li.innerHTML = '<a href="' + ch.id + '.html">' + inner + '</a>';
        } else {
          li.innerHTML = '<span class="off">' + inner + '</span>';
        }
        list.appendChild(li);
      });
    }

    var resume = document.getElementById('resume');
    if (resume) {
      var last = progress['_last'];
      var target = BOOK[0];
      if (last) {
        BOOK.forEach(function (c) { if (c.id === last.id && c.ready) target = c; });
      }
      if (last && target.id === last.id && last.screen > 0) {
        resume.href = target.id + '.html#s' + (last.screen + 1);
        resume.textContent = '이어서 읽기 — ' + target.num + ' 화면 ' + (last.screen + 1);
      } else {
        resume.href = target.id + '.html';
        resume.textContent = '처음부터 읽기 — ' + target.num;
      }
    }

    highlightAll(document);
    initTerms(document);
    initTabs(document);
    initQuiz(document);
    initTip();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.documentElement.dataset.page === 'cover') initCover();
    else initChapter();
  });
})();
