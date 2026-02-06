const summaryEl = document.getElementById('summary');
const caseListEl = document.getElementById('case-list');
const caseDetailEl = document.getElementById('case-detail');

const state = {
  report: null,
  selectedCaseId: null,
  cache: new Map(),
};

function statusClass(status) {
  if (status === 'PASSED') return 'status-pass';
  if (status === 'FAILED') return 'status-fail';
  return 'status-skip';
}

function toKoreanStatus(status) {
  if (status === 'PASSED') return 'PASS';
  if (status === 'FAILED') return 'FAIL';
  return 'SKIP';
}

function clearElement(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderSummary(report) {
  clearElement(summaryEl);

  const items = [
    ['Suite', report.suite],
    ['Fixture', report.fixtureOrigin ?? '-'],
    ['Total', String(report.summary.total)],
    ['Passed', String(report.summary.passed)],
    ['Failed', String(report.summary.failed)],
    ['Skipped', String(report.summary.skipped)],
    ['Generated At', report.generatedAt],
  ];

  for (const [label, value] of items) {
    const card = document.createElement('div');
    card.className = 'summary-item';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = value;

    card.append(labelEl, valueEl);
    summaryEl.append(card);
  }
}

function renderCaseList() {
  clearElement(caseListEl);

  if (!state.report) {
    return;
  }

  for (const entry of state.report.cases) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `case-item ${entry.id === state.selectedCaseId ? 'active' : ''}`;

    const idEl = document.createElement('span');
    idEl.className = 'id';
    idEl.textContent = entry.id;

    const statusEl = document.createElement('span');
    statusEl.className = `status ${statusClass(entry.status)}`;
    statusEl.textContent = toKoreanStatus(entry.status);

    const durationEl = document.createElement('span');
    durationEl.style.display = 'block';
    durationEl.style.marginTop = '6px';
    durationEl.style.color = 'var(--muted)';
    durationEl.style.fontSize = '12px';
    durationEl.textContent = `${entry.durationMs}ms`;

    button.append(idEl, statusEl, durationEl);
    button.addEventListener('click', () => {
      state.selectedCaseId = entry.id;
      renderCaseList();
      void renderCaseDetail();
    });

    caseListEl.append(button);
  }
}

function createMetaItem(label, value) {
  const wrap = document.createElement('div');
  wrap.className = 'meta-item';

  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = value;

  wrap.append(labelEl, valueEl);
  return wrap;
}

async function fetchArtifactText(relativePath) {
  if (!relativePath) {
    return '';
  }

  if (state.cache.has(relativePath)) {
    return state.cache.get(relativePath);
  }

  const response = await fetch(`/artifacts/latest/${relativePath}?t=${Date.now()}`);
  if (!response.ok) {
    const fallback = `[${response.status}] ${relativePath}`;
    state.cache.set(relativePath, fallback);
    return fallback;
  }

  const text = await response.text();
  state.cache.set(relativePath, text);
  return text;
}

async function renderCaseDetail() {
  clearElement(caseDetailEl);

  if (!state.report) {
    caseDetailEl.textContent = '리포트를 찾을 수 없습니다.';
    return;
  }

  const selected = state.report.cases.find((entry) => entry.id === state.selectedCaseId);
  if (!selected) {
    caseDetailEl.textContent = '좌측 케이스를 선택하세요.';
    return;
  }

  const title = document.createElement('h2');
  title.textContent = `${selected.id} (${toKoreanStatus(selected.status)})`;

  const metaGrid = document.createElement('div');
  metaGrid.className = 'case-meta';
  metaGrid.append(
    createMetaItem('Title', selected.title),
    createMetaItem('Exit Code', selected.exitCode === null ? 'n/a' : String(selected.exitCode)),
    createMetaItem('Duration', `${selected.durationMs}ms`),
    createMetaItem('Suite', selected.suite),
    createMetaItem('Status', selected.status),
    createMetaItem('Command', selected.command),
  );

  caseDetailEl.append(title, metaGrid);

  if (selected.skippedReason) {
    const skipped = document.createElement('p');
    skipped.style.color = '#fcd34d';
    skipped.textContent = `Skipped Reason: ${selected.skippedReason}`;
    caseDetailEl.append(skipped);
  }

  const checkTitle = document.createElement('h3');
  checkTitle.textContent = 'Checks';
  checkTitle.style.margin = '12px 0 8px';

  const checkList = document.createElement('ul');
  checkList.className = 'check-list';

  for (const check of selected.checks) {
    const item = document.createElement('li');
    item.className = `check-item ${check.passed ? 'pass' : 'fail'}`;

    const heading = document.createElement('strong');
    heading.textContent = `${check.passed ? 'PASS' : 'FAIL'} · ${check.name}`;

    const detail = document.createElement('div');
    detail.style.marginTop = '4px';
    detail.style.color = 'var(--muted)';
    detail.textContent = check.detail;

    item.append(heading, detail);
    checkList.append(item);
  }

  caseDetailEl.append(checkTitle, checkList);

  const [stdout, stderr] = await Promise.all([
    fetchArtifactText(selected.stdoutPath),
    fetchArtifactText(selected.stderrPath),
  ]);

  const logsWrap = document.createElement('div');
  logsWrap.className = 'logs';

  const stdoutWrap = document.createElement('div');
  const stdoutTitle = document.createElement('h3');
  stdoutTitle.textContent = 'stdout';
  const stdoutPre = document.createElement('pre');
  stdoutPre.textContent = stdout || '(empty)';
  stdoutWrap.append(stdoutTitle, stdoutPre);

  const stderrWrap = document.createElement('div');
  const stderrTitle = document.createElement('h3');
  stderrTitle.textContent = 'stderr';
  const stderrPre = document.createElement('pre');
  stderrPre.textContent = stderr || '(empty)';
  stderrWrap.append(stderrTitle, stderrPre);

  logsWrap.append(stdoutWrap, stderrWrap);
  caseDetailEl.append(logsWrap);

  if (selected.comparisons.length > 0) {
    const comparisonsWrap = document.createElement('div');
    comparisonsWrap.className = 'comparisons';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Markdown Comparisons';
    comparisonsWrap.append(titleEl);

    for (const comparison of selected.comparisons) {
      const [expectedText, actualText, diffText] = await Promise.all([
        fetchArtifactText(comparison.expectedPath),
        fetchArtifactText(comparison.actualPath),
        fetchArtifactText(comparison.diffPath),
      ]);

      const block = document.createElement('section');
      block.className = 'comparison';

      const heading = document.createElement('h4');
      const resultLabel = comparison.matched ? 'MATCH' : 'DIFF';
      heading.textContent = `${comparison.label} (${resultLabel})`;

      const grid = document.createElement('div');
      grid.className = 'comparison-grid';

      const expectedWrap = document.createElement('div');
      const expectedTitle = document.createElement('h5');
      expectedTitle.textContent = 'expected';
      const expectedPre = document.createElement('pre');
      expectedPre.textContent = expectedText || '(missing)';
      expectedWrap.append(expectedTitle, expectedPre);

      const actualWrap = document.createElement('div');
      const actualTitle = document.createElement('h5');
      actualTitle.textContent = 'actual';
      const actualPre = document.createElement('pre');
      actualPre.textContent = actualText || '(missing)';
      actualWrap.append(actualTitle, actualPre);

      grid.append(expectedWrap, actualWrap);
      block.append(heading, grid);

      if (!comparison.matched) {
        const diffTitle = document.createElement('h5');
        diffTitle.textContent = 'diff';
        const diffPre = document.createElement('pre');
        diffPre.textContent = diffText || '(diff unavailable)';
        block.append(diffTitle, diffPre);
      }

      comparisonsWrap.append(block);
    }

    caseDetailEl.append(comparisonsWrap);
  }
}

async function loadReport() {
  try {
    const response = await fetch(`/artifacts/latest/report.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`report.json not found (${response.status})`);
    }

    state.report = await response.json();
    state.selectedCaseId = state.report.cases[0]?.id ?? null;
    state.cache.clear();

    renderSummary(state.report);
    renderCaseList();
    await renderCaseDetail();
  } catch (error) {
    clearElement(caseDetailEl);
    const message = document.createElement('p');
    message.textContent = `리포트 로드 실패: ${error instanceof Error ? error.message : String(error)}`;
    caseDetailEl.append(message);
  }
}

void loadReport();
