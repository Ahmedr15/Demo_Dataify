// Dataify demo - everything is simulated with pre-defined data (no real processing).

const HEADERS = ["id", "name", "age", "spend", "status", "date"];

// A cell is a plain value, or {r: raw, f: fixed, s: action index that fixes it}
const ROWS = [
    ["101", "John Doe", "28", "$150.00", "Active", "2026-01-10"],
    ["102", "Jane Smith", {r:"N/A", f:"30", s:1}, "$230.50", {r:"active ", f:"Active", s:4}, {r:"2026/01/11", f:"2026-01-11", s:3}],
    ["103", "Robert Cheney", "45", {r:"-$50.00", f:"0.00", s:2}, "Inactive", {r:"12-01-2026", f:"2026-01-12", s:3}],
    ["104", "Alice Brown", "31", "$500.00", {r:"ACTIVE", f:"Active", s:4}, "2026-01-13"],
    {dupOf: 0, s: 0, cells: ["101", "John Doe", "28", "$150.00", "Active", "2026-01-10"]},
    ["105", "Emily Davis", {r:"NaN", f:"30", s:1}, "$80.20", "Pending", "2026-01-15"]
];

const ACTIONS = [
    { name: "Remove duplicate records", type: "Uniqueness", gain: 6, desc: "1 exact duplicate row detected. Suggested action: remove it." },
    { name: "Fill missing values", type: "Completeness", gain: 6, desc: "Missing entries found in the 'age' column. Suggested action: fill them with a typical value." },
    { name: "Fix invalid amounts", type: "Validity", gain: 6, desc: "Currency symbols and a negative amount found in 'spend'. Suggested action: convert to clean positive numbers." },
    { name: "Standardize date format", type: "Consistency", gain: 5, desc: "Dates appear in 3 different formats. Suggested action: unify to YYYY-MM-DD." },
    { name: "Standardize text values", type: "Consistency", gain: 5, desc: "'status' has inconsistent spelling and spacing. Suggested action: unify to one style." }
];

const SOURCE_LABELS = { csv: "CSV", json: "JSON", db: "Database", text: "Text" };
const BASE_SCORE = 68;

let state = { decisions: [], running: false, source: "csv", mode: "Manual" };

const $ = id => document.getElementById(id);

// ---------- Source tabs ----------
document.querySelectorAll('#source-tabs li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelectorAll('#source-tabs li').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.source-panel').forEach(p => p.classList.remove('active'));
        li.classList.add('active');
        $('panel-' + li.dataset.source).classList.add('active');
    });
});

// File pickers: only show the file name (demo does not read the data)
[['file-csv','name-csv'], ['file-json','name-json']].forEach(([inp, lbl]) => {
    $(inp).addEventListener('change', e => {
        if (e.target.files[0]) $(lbl).textContent = e.target.files[0].name;
    });
});
const dz = $('dropzone-csv');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--green-primary)'; });
dz.addEventListener('dragleave', () => dz.style.borderColor = '');
dz.addEventListener('drop', e => {
    e.preventDefault(); dz.style.borderColor = '';
    if (e.dataTransfer.files[0]) $('name-csv').textContent = e.dataTransfer.files[0].name;
});

// ---------- Start analysis ----------
function startAnalysis(source) {
    state = { decisions: ACTIONS.map(() => null), running: false, source, mode: "Manual" };
    $('source-badge').textContent = SOURCE_LABELS[source] + " source";
    $('row-count-badge').textContent = ROWS.length + " records loaded";
    $('audit-table').querySelector('tbody').innerHTML = '';
    $('result-section').classList.add('hidden');
    $('cleaning-section').classList.remove('hidden');
    $('btn-auto').disabled = false;
    renderTable();
    renderActions();
    updateProgress();
    $('cleaning-section').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Rendering ----------
function renderTable() {
    const applied = i => state.decisions[i] === 'applied';
    $('data-table').querySelector('thead').innerHTML =
        '<tr>' + HEADERS.map(h => `<th>${h.toUpperCase()}</th>`).join('') + '</tr>';
    $('data-table').querySelector('tbody').innerHTML = ROWS.map(row => {
        const isDup = !Array.isArray(row);
        const cells = isDup ? row.cells : row;
        const removed = isDup && applied(row.s);
        const tds = cells.map(c => {
            if (typeof c === 'string') return `<td class="${isDup && !removed ? 'cell-duplicate' : ''}">${c}</td>`;
            if (applied(c.s)) return `<td class="fixed-cell">${c.f}</td>`;
            const cls = (c.s === 1) ? 'cell-missing' : 'cell-invalid';
            return `<td class="${cls}">${c.r}</td>`;
        }).join('');
        return `<tr class="${removed ? 'removed-row' : ''}">${tds}</tr>`;
    }).join('');
}

function renderActions() {
    $('steps-container').innerHTML = ACTIONS.map((a, i) => {
        const d = state.decisions[i];
        const label = d === 'applied' ? 'Applied' : d === 'skipped' ? 'Skipped' : d === 'running' ? 'Running...' : 'Waiting for confirmation';
        const locked = d !== null || state.running;
        return `
        <div class="step-card ${d || ''}">
            <div class="step-card-header">
                <span class="step-title"><i class="fa-solid fa-gears"></i> ${i + 1}. ${a.name}</span>
                <span><span class="badge">${a.type}</span> <span class="status-pill">${label}</span></span>
            </div>
            <div class="power-query-desc">${a.desc}</div>
            <div class="step-actions">
                <button class="btn btn-accept" ${locked ? 'disabled' : ''} onclick="decide(${i}, 'applied')"><i class="fa-solid fa-check"></i> Confirm &amp; Apply</button>
                <button class="btn btn-skip" ${locked ? 'disabled' : ''} onclick="decide(${i}, 'skipped')"><i class="fa-solid fa-forward"></i> Skip</button>
            </div>
        </div>`;
    }).join('');
}

function updateProgress() {
    const done = state.decisions.filter(d => d === 'applied' || d === 'skipped').length;
    $('progress-bar').style.width = (done / ACTIONS.length * 100) + '%';
    const score = BASE_SCORE + ACTIONS.reduce((s, a, i) => s + (state.decisions[i] === 'applied' ? a.gain : 0), 0);
    const el = $('overall-score');
    el.textContent = score + '%';
    el.classList.toggle('good', score >= 90);
}

// ---------- Decisions ----------
function logAudit(i, decision) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${ACTIONS[i].name}</td>
        <td><span class="badge" style="color:${decision === 'applied' ? '#10b981' : '#f59e0b'}">${decision.toUpperCase()}</span></td>
        <td>${state.mode}</td><td>${new Date().toLocaleTimeString()}</td>`;
    $('audit-table').querySelector('tbody').appendChild(tr);
}

function decide(i, decision) {
    state.decisions[i] = decision;
    logAudit(i, decision);
    renderTable(); renderActions(); updateProgress();
    checkFinished();
}

function checkFinished() {
    if (state.decisions.every(d => d === 'applied' || d === 'skipped')) showResult();
}

$('btn-auto').addEventListener('click', async () => {
    if (state.running) return;
    state.running = true;
    state.mode = "Automatic";
    $('btn-auto').disabled = true;
    for (let i = 0; i < ACTIONS.length; i++) {
        if (state.decisions[i] !== null) continue;
        state.decisions[i] = 'running';
        renderActions();
        await new Promise(r => setTimeout(r, 700));
        state.decisions[i] = 'applied';
        logAudit(i, 'applied');
        renderTable(); renderActions(); updateProgress();
    }
    state.running = false;
    checkFinished();
});

function showResult() {
    const score = BASE_SCORE + ACTIONS.reduce((s, a, i) => s + (state.decisions[i] === 'applied' ? a.gain : 0), 0);
    $('final-score').textContent = score + '%';
    $('result-section').classList.remove('hidden');
    $('result-section').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Download / restart ----------
$('btn-download').addEventListener('click', () => {
    const applied = i => state.decisions[i] === 'applied';
    const lines = [HEADERS.join(',')];
    ROWS.forEach(row => {
        const isDup = !Array.isArray(row);
        if (isDup && applied(row.s)) return;
        const cells = isDup ? row.cells : row;
        lines.push(cells.map(c => typeof c === 'string' ? c : (applied(c.s) ? c.f : c.r)).join(','));
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'dataify_cleaned.csv';
    a.click();
});

$('btn-restart').addEventListener('click', () => {
    $('cleaning-section').classList.add('hidden');
    $('result-section').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});