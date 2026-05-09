import { EXAMS } from "./data.js";

const state = {
  examId: "96",
  part: "전체",
  query: "",
  selectedId: null,
  page: null,
  pdfOverride: {},
  zoom: 100,
  sidebarFolded: true
};

const app = document.querySelector("#app");

function circ(answer) {
  const map = { "1": "1번", "2": "2번", "3": "3번", "4": "4번" };
  return map[String(answer)] || answer;
}

function getExam() {
  return EXAMS.find(e => e.id === state.examId) || EXAMS[0];
}

function getQuestions() {
  const exam = getExam();
  const q = state.query.trim().toLowerCase();
  return exam.questions.filter(item => {
    const text = `${item.part} ${item.number} ${item.topic} ${item.answer}`.toLowerCase();
    return (state.part === "전체" || item.part === state.part) && (!q || text.includes(q));
  });
}

function getSelected() {
  const exam = getExam();
  if (!state.selectedId) state.selectedId = exam.questions[0]?.id;
  return exam.questions.find(q => q.id === state.selectedId) || getQuestions()[0] || exam.questions[0];
}

function setSelected(id) {
  //const item = getExam().questions.find(q => q.id === id); 문제번호 매핑이 안돼 주석처리함
  state.selectedId = id;
  //state.page = item?.pages?.[0] || 1;
  //render();
   updateWithoutReloadingPdf(); //  리로드 안되도록 추가 
}

function move(delta) {
  const list = getQuestions();
  const selected = getSelected();
  const idx = list.findIndex(q => q.id === selected.id);
  if (!list.length) return;
  const next = (Math.max(idx, 0) + delta + list.length) % list.length;
  setSelected(list[next].id);
}
function updateWithoutReloadingPdf() {
  const selected = getSelected();

  updateQuestionActiveState(selected);
  updateSolutionPanel(selected);
  updatePdfHeaderOnly(selected);
  bindSolutionOnlyEvents();
}

function updateQuestionActiveState(selected) {
  document.querySelectorAll(".qCard").forEach(card => {
    card.classList.toggle("active", card.dataset.id === selected.id);
  });
}

function updatePdfHeaderOnly(selected) {
  const paneTitle = document.querySelector(".pdfPane .paneTitle");
  if (!paneTitle) return;

  const pageButtons = selected.pages
    .map(p => `<button class="${state.page === p ? "active" : ""}" data-page="${p}">p.${p}</button>`)
    .join("");

  paneTitle.innerHTML = `
    <div>
      <div class="kicker">PDF 기준 문제·해설</div>
      <h2>원문 페이지</h2>
    </div>
    <div class="pageBtns">
      ${pageButtons}
    </div>
  `;

  document.querySelectorAll(".pageBtns button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.page = Number(btn.dataset.page);

      const frame = document.querySelector(".pdfFrame");
      const exam = getExam();
      if (frame) {
        frame.src = pdfSrc(exam, state.page);
      }

      document.querySelectorAll(".pageBtns button").forEach(b => {
        b.classList.toggle("active", Number(b.dataset.page) === state.page);
      });
    });
  });
}

function updateSolutionPanel(selected) {
  const solution = document.querySelector(".solution");
  if (!solution) return;

  solution.innerHTML = `
    <div class="solutionHead">
      <div>
        <div class="badges">
          <span>${getExam().label}</span>
          <span>${selected.part}</span>
          <span>A형</span>
        </div>
        <h2>${selected.number}번 · ${selected.topic}</h2>
      </div>
      <div class="answer">정답 ${circ(selected.answer)}</div>
    </div>

    <div class="nav">
      <button id="prevBtn">이전 문항</button>
      <button id="nextBtn">다음 문항</button>
    </div>

    <article class="box">
      <h3>실전 단계별 풀이</h3>
      <ol class="steps">
        ${selected.steps.map((s, i) => `
          <li>
            <span>${i + 1}</span>
            <div>
              <h4>${s.title}</h4>
              <p>${s.body}</p>
            </div>
          </li>
        `).join("")}
      </ol>
    </article>

    <article class="box">
      <h3>시험장에서 체크할 것</h3>
      <ul>
        ${selected.tips.map(t => `<li>${t}</li>`).join("")}
      </ul>
    </article>
  `;
}

function bindSolutionOnlyEvents() {
  document.querySelector("#prevBtn")?.addEventListener("click", () => move(-1));
  document.querySelector("#nextBtn")?.addEventListener("click", () => move(1));
}

function pdfSrc(exam, page) {
  const base = state.pdfOverride[exam.id] || exam.pdfUrl;
  const glue = base.includes("?") ? "&" : "#";
  return `${base}${glue}page=${page}&zoom=${state.zoom}`;
}

function render() {
  const exam = getExam();
  const selected = getSelected();
  if (!state.page) state.page = selected?.pages?.[0] || 1;
  const questions = getQuestions();

  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="kicker">Certificate_Hunter</div>
        <h1>기업회계 1급</h1>
<p>
  제작자 블로그:
  <a
    href="https://blog.naver.com/adp_jht"
    target="_blank"
    rel="noopener noreferrer"
    class="blogLink"
  >
    https://blog.naver.com/adp_jht
  </a>
</p>
      </div>
      <div class="controls">
        <label>회차
          <select id="examSelect">
            ${EXAMS.map(e => `<option value="${e.id}" ${e.id === exam.id ? "selected" : ""}>${e.label}</option>`).join("")}
          </select>
        </label>
        <label>확대
          <select id="zoomSelect">
            ${[100,110,125,140,160,180].map(z => `<option value="${z}" ${z === state.zoom ? "selected" : ""}>${z}%</option>`).join("")}
          </select>
        </label>
        <label class="uploadBtn">내 PDF로 교체
          <input id="pdfUpload" type="file" accept="application/pdf" />
        </label>
      </div>
    </header>

<main class="layout ${state.sidebarFolded ? "sidebarFolded" : ""}">
  <aside class="sidebar ${state.sidebarFolded ? "collapsed" : ""}">
    <button id="foldBtn" class="foldBtn" title="${state.sidebarFolded ? "문항 목록 펼치기" : "문항 목록 접기"}">
      ${state.sidebarFolded ? "›" : "‹"}
    </button>
<div class="sideHead">
  <h2>${exam.label} 문항</h2>
  <span>${questions.length}개</span>
</div>

<div class="collapsedInfo">
  <strong>${selected.part.replace("회계", "")}</strong>
  <span>${selected.number}번</span>
</div>
        <input id="search" class="search" placeholder="문항 번호, 주제, 정답 검색" value="${state.query.replaceAll('"','&quot;')}" />
        <div class="tabs">
          ${["전체","재무회계","원가회계"].map(p => `<button class="${state.part===p?'active':''}" data-part="${p}">${p}</button>`).join("")}
        </div>
        <div class="qList">
          ${questions.map(q => `
            <button class="qCard ${q.id === selected.id ? "active" : ""}" data-id="${q.id}">
              <div><strong>${q.part} ${q.number}번</strong><span>${q.pages.map(p => `p.${p}`).join(", ")}</span></div>
              <p>${q.topic}</p>
              <b>정답 ${circ(q.answer)}</b>
            </button>
          `).join("")}
        </div>
      </aside>

      <section class="pdfPane">
        <div class="paneTitle">
          <div>
            <div class="kicker">PDF 기준 문제·해설</div>
            <h2>원문 페이지</h2>
          </div>
          <div class="pageBtns">
            ${selected.pages.map(p => `<button class="${state.page===p?'active':''}" data-page="${p}">p.${p}</button>`).join("")}
          </div>
        </div>
 <div class="pdfFrameWrap">
  <iframe class="pdfFrame" src="${pdfSrc(exam, state.page)}" title="PDF 원문"></iframe>
</div>

<div class="pdfSource">
  <strong>출처</strong>
  <span>
    한국세무사회 국가공인 전산세무회계 자격시험 기업회계 1급 확정답안 PDF 원문을 학습 목적으로 표시했습니다.
  </span>
</div><iframe class="pdfFrame" src="${pdfSrc(exam, state.page)}" title="PDF 원문"></iframe>
      </section>

      <section class="solution">
        <div class="solutionHead">
          <div>
            <div class="badges"><span>${exam.label}</span><span>${selected.part}</span><span>A형</span></div>
            <h2>${selected.number}번 · ${selected.topic}</h2>
          </div>
          <div class="answer">정답 ${circ(selected.answer)}</div>
        </div>

        <div class="nav">
          <button id="prevBtn">이전 문항</button>
          <button id="nextBtn">다음 문항</button>
        </div>

        <article class="box">
          <h3>실전 단계별 풀이</h3>
          <ol class="steps">
            ${selected.steps.map((s, i) => `
              <li>
                <span>${i+1}</span>
                <div><h4>${s.title}</h4><p>${s.body}</p></div>
              </li>
            `).join("")}
          </ol>
        </article>

        <article class="box">
          <h3>시험장에서 체크할 것</h3>
          <ul>
            ${selected.tips.map(t => `<li>${t}</li>`).join("")}
          </ul>
        </article>
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelector("#foldBtn").addEventListener("click", () => {
    state.sidebarFolded = !state.sidebarFolded;
    render();
  });

  document.querySelector("#examSelect").addEventListener("change", e => {
    state.examId = e.target.value;
    const exam = getExam();
    state.selectedId = exam.questions[0]?.id;
    state.page = exam.questions[0]?.pages?.[0] || 1;
    state.query = "";
    state.part = "전체";
    render();
  });

  document.querySelector("#zoomSelect").addEventListener("change", e => {
    state.zoom = Number(e.target.value);
    render();
  });

  document.querySelector("#pdfUpload").addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (state.pdfOverride[state.examId]) URL.revokeObjectURL(state.pdfOverride[state.examId]);
    state.pdfOverride[state.examId] = URL.createObjectURL(file);
    render();
  });

  document.querySelector("#search").addEventListener("input", e => {
    state.query = e.target.value;
    render();
  });

  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.part = btn.dataset.part;
      const first = getQuestions()[0];
      if (first) {
        state.selectedId = first.id;
        //state.page = first.pages[0]; 페이지 매핑안돼 주석 
      }
      render();
    });
  });

  document.querySelectorAll(".qCard").forEach(btn => {
    btn.addEventListener("click", () => setSelected(btn.dataset.id));
  });

  document.querySelectorAll(".pageBtns button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.page = Number(btn.dataset.page);
      render();
    });
  });

  //document.querySelector("#prevBtn").addEventListener("click", () => move(-1)); 스크롤 안바뀌도록 주석
  //document.querySelector("#nextBtn").addEventListener("click", () => move(1));
  bindSolutionOnlyEvents();
}

render();
