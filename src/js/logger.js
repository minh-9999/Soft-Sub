// ── logger.js — Console log rendering ─────────────────────────

var lineCount = 0;

function ts() {
  return new Date().toTimeString().slice(0, 8);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function appendLog(raw) {
  const empty = document.getElementById('logEmpty');
  if (empty) empty.remove();

  // Parse [STEP][OUT|ERR] prefix
  const m = raw.match(/^\[([^\]]+)\]\[(OUT|ERR)\]\s*(.*)/s);
  let tag = 'info', tagText = 'SYS', msg = raw;

  if (m) {
    const stepId = m[1].toLowerCase();
    const type   = m[2];
    msg     = m[3];
    tagText = type;
    tag     = type === 'ERR' ? 'err' : 'out';
    activateStep(stepId);
  } else if (raw.toLowerCase().includes('starting')) {
    tag = 'sys'; tagText = 'SYS';
  } else if (raw.toLowerCase().includes('finished') || raw.toLowerCase().includes('done')) {
    tag = 'done'; tagText = 'OK';
  }

  lineCount++;
  document.getElementById('logCount').textContent = lineCount + ' lines';

  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-ts">${ts()}</span>
    <span class="log-tag ${tag}">${tagText}</span>
    <span class="log-msg ${tag === 'err' ? 'err-msg' : ''}">${escHtml(msg)}</span>
  `;

  const body = document.getElementById('logBody');
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function clearLogs() {
  document.getElementById('logBody').innerHTML = `
    <div class="log-empty" id="logEmpty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M7 8h10M7 12h6M7 16h4"/>
      </svg>
      <p>NO OUTPUT YET</p>
    </div>`;
  lineCount = 0;
  document.getElementById('logCount').textContent = '0 lines';
  document.getElementById('doneBanner').classList.remove('show');
}