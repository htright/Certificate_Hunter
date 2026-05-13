import { EXAMS } from "./data.js";

const state = {
  examId: "96",
  part: "전체",
  query: "",
  selectedId: null,
  page: null,
  pdfOverride: {},
  zoom: 100,
  sidebarFolded: false,
  syncPdfOnMove: false
};

const app = document.querySelector("#app");

let pdfLoadToken = 0;

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

    return (
      (state.part === "전체" || item.part === state.part) &&
      (!q || text.includes(q))
    );
  });
}

function getSelected() {
  const exam = getExam();

  if (!state.selectedId) {
    state.selectedId = exam.questions[0]?.id;
  }

  return (
    exam.questions.find(q => q.id === state.selectedId) ||
    getQuestions()[0] ||
    exam.questions[0]
  );
}

function pdfSrc(exam, page) {
  const base = state.pdfOverride[exam.id] || exam.pdfUrl;
  const cleanBase = base.split("#")[0];
  return `${cleanBase}#page=${page}&zoom=${state.zoom}`;
}

function updatePdfFrame() {
  const frame = document.querySelector(".pdfFrame");
  const exam = getExam();

  if (!frame || !state.page) return;

  frame.src = pdfSrc(exam, state.page);
}

function updatePageButtonActiveState() {
  document.querySelectorAll(".pageBtns button").forEach(btn => {
    btn.classList.toggle(
      "active",
      Number(btn.dataset.page) === Number(state.page)
    );
  });
}

function bindPageButtonEvents() {
  document.querySelectorAll(".pageBtns button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.page = Number(btn.dataset.page);
      updatePageButtonActiveState();
      updatePdfFrame();
    });
  });
}

function updatePdfHeaderOnly(selected) {
  const paneTitle = document.querySelector(".pdfPane .paneTitle");
  if (!paneTitle || !selected) return;

  const pageButtons = selected.pages
    .map(p => `
      <button
        class="${Number(state.page) === Number(p) ? "active" : ""}"
        data-page="${p}"
      >
        p.${p}
      </button>
    `)
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

  bindPageButtonEvents();
}

function updateQuestionActiveState(selected) {
  document.querySelectorAll(".qCard").forEach(card => {
    card.classList.toggle("active", card.dataset.id === selected.id);
  });
}

function updateSolutionPanel(selected) {
  const solution = document.querySelector(".solution");
  if (!solution || !selected) return;

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

function updateWithoutReloadingPdf(options = {}) {
  const { refreshPdf = false } = options;
  const selected = getSelected();

  updateQuestionActiveState(selected);
  updateSolutionPanel(selected);
  updatePdfHeaderOnly(selected);

  if (refreshPdf) {
    updatePdfFrame();
  }

  bindSolutionOnlyEvents();
}

function setSelected(id, options = {}) {
  const { syncPdf = false } = options;

  // 현재 PDF가 보고 있는 페이지
  const currentPdfPage = Number(state.page);

  // 먼저 문항만 변경
  state.selectedId = id;

  const selected = getSelected();

  // 다음/이전 문항이 연결된 PDF 첫 페이지
  const targetPdfPage = Number(selected?.pages?.[0] || currentPdfPage || 1);

  if (syncPdf && selected?.pages?.length) {
    // PDF상 현재 페이지와 이동할 문항의 페이지가 다를 때만 리로드
    if (currentPdfPage !== targetPdfPage) {
      state.page = targetPdfPage;
      render();
      return;
    }

    // PDF상 현재 페이지와 같으면 PDF는 그대로 두고 풀이만 변경
    updateWithoutReloadingPdf({
      refreshPdf: false
    });
    return;
  }

  // 체크 OFF 또는 문항 목록 클릭: PDF 이동 없이 풀이만 변경
  updateWithoutReloadingPdf({
    refreshPdf: false
  });
}

function move(delta) {
  const list = getQuestions();
  const selected = getSelected();

  if (!list.length || !selected) return;

  const idx = list.findIndex(q => q.id === selected.id);
  const currentIndex = idx >= 0 ? idx : 0;
  const next = (currentIndex + delta + list.length) % list.length;

  setSelected(list[next].id, {
    syncPdf: state.syncPdfOnMove
  });
}

function render() {
  const exam = getExam();
  const selected = getSelected();

  if (!state.page) {
    state.page = selected?.pages?.[0] || 1;
  }

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
          / 문의: adp_jht@naver.com
        </p>
      </div>

      <div class="controls">
        <label>회차
          <select id="examSelect">
            ${EXAMS.map(e => `
              <option value="${e.id}" ${e.id === exam.id ? "selected" : ""}>
                ${e.label}
              </option>
            `).join("")}
          </select>
        </label>

        <label>확대
          <select id="zoomSelect">
            ${[100, 110, 125, 140, 160, 180].map(z => `
              <option value="${z}" ${z === state.zoom ? "selected" : ""}>
                ${z}%
              </option>
            `).join("")}
          </select>
        </label>

        <label class="syncPdfControl">
          <input
            id="syncPdfOnMove"
            type="checkbox"
            ${state.syncPdfOnMove ? "checked" : ""}
          />
          이전/다음 시 PDF 이동
        </label>

        <label class="uploadBtn">내 PDF로 교체
          <input id="pdfUpload" type="file" accept="application/pdf" />
        </label>
      </div>
    </header>

    <main class="layout ${state.sidebarFolded ? "sidebarFolded" : ""}">
      <aside class="sidebar ${state.sidebarFolded ? "collapsed" : ""}">
        <button
          id="foldBtn"
          class="foldBtn"
          title="${state.sidebarFolded ? "문항 목록 펼치기" : "문항 목록 접기"}"
        >
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

        <input
          id="search"
          class="search"
          placeholder="문항 번호, 주제, 정답 검색"
          value="${state.query.replaceAll('"', '&quot;')}"
        />

        <div class="tabs">
          ${["전체", "재무회계", "원가회계"].map(p => `
            <button class="${state.part === p ? "active" : ""}" data-part="${p}">
              ${p}
            </button>
          `).join("")}
        </div>

        <div class="qList">
          ${questions.map(q => `
            <button
              class="qCard ${q.id === selected.id ? "active" : ""}"
              data-id="${q.id}"
            >
              <div>
                <strong>${q.part} ${q.number}번</strong>
                <span>${q.pages.map(p => `p.${p}`).join(", ")}</span>
              </div>
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
            ${selected.pages.map(p => `
              <button
                class="${Number(state.page) === Number(p) ? "active" : ""}"
                data-page="${p}"
              >
                p.${p}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="pdfFrameWrap">
          <iframe
            class="pdfFrame"
            src="${pdfSrc(exam, state.page)}"
            title="PDF 원문"
          ></iframe>
        </div>

        <div class="pdfSource">
          <strong>출처</strong>
          <span>
            한국세무사회 국가공인 전산세무회계 자격시험 기업회계 1급 확정답안 PDF 원문을 학습 목적으로 표시했습니다.
          </span>
        </div>
      </section>

      <section class="solution">
        <div class="solutionHead">
          <div>
            <div class="badges">
              <span>${exam.label}</span>
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
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelector("#foldBtn")?.addEventListener("click", () => {
    state.sidebarFolded = !state.sidebarFolded;
    render();
  });

  document.querySelector("#examSelect")?.addEventListener("change", e => {
    state.examId = e.target.value;

    const exam = getExam();
    const first = exam.questions[0];

    state.selectedId = first?.id || null;
    state.page = first?.pages?.[0] || 1;
    state.query = "";
    state.part = "전체";

    render();
  });

  document.querySelector("#zoomSelect")?.addEventListener("change", e => {
    state.zoom = Number(e.target.value);
    updatePdfFrame();
  });

  document.querySelector("#syncPdfOnMove")?.addEventListener("change", e => {
    state.syncPdfOnMove = e.target.checked;
  });

  document.querySelector("#pdfUpload")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (state.pdfOverride[state.examId]) {
      URL.revokeObjectURL(state.pdfOverride[state.examId]);
    }

    state.pdfOverride[state.examId] = URL.createObjectURL(file);
    updatePdfFrame();
  });

  document.querySelector("#search")?.addEventListener("input", e => {
    state.query = e.target.value;

    const first = getQuestions()[0];
    if (first) {
      state.selectedId = first.id;
    }

    render();
  });

  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.part = btn.dataset.part;

      const first = getQuestions()[0];
      if (first) {
        state.selectedId = first.id;
      }

      render();
    });
  });

  document.querySelectorAll(".qCard").forEach(btn => {
    btn.addEventListener("click", () => {
      // 문항 목록 클릭은 PDF 이동하지 않음
      setSelected(btn.dataset.id, {
        syncPdf: false
      });
    });
  });

  bindPageButtonEvents();
  bindSolutionOnlyEvents();
}

render();