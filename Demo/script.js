// script.js

// Global state simulation
const rawDataset = [
    { id: "101", name: "John Doe", age: "28", spend: "$150.00", status: "Active", date: "2026-01-10" },
    { id: "102", name: "Jane Smith", age: "N/A", spend: "$230.50", status: "active ", date: "2026/01/11" },
    { id: "103", name: "Robert Cheney", age: "45", spend: "-$50.00", status: "Inactive", date: "12-01-2026" },
    { id: "104", name: "Alice Brown", age: "31", spend: "$500.00", status: "ACTIVE", date: "2026-01-13" },
    { id: "101", name: "John Doe", age: "28", spend: "$150.00", status: "Active", date: "2026-01-10" }, // Duplicate
    { id: "105", name: "Emily Davis", age: "NaN", spend: "$80.20", status: "Pending", date: "2026-01-15" }
];

let transformationSteps = [
    {
        id: "STEP-01",
        name: "Deduplication Strategy",
        type: "Uniqueness",
        description: "Power Query Details: Detected 1 exact duplicate record (Row #5 matching Row #1 across key columns). Action will drop duplicate rows.",
        status: "ACCEPTED",
        config: "Exact Match Rule"
    },
    {
        id: "STEP-02",
        name: "Missing Value Imputation (Age Column)",
        type: "Completeness",
        description: "Power Query Details: Found non-numeric missing entries ('N/A', 'NaN') in column 'age'. Recommended action is Median Imputation (Calculated Median = 30).",
        status: "ACCEPTED",
        config: "Median Imputation"
    },
    {
        id: "STEP-03",
        name: "Currency & Anomaly Normalization (Spend Column)",
        type: "Accuracy",
        description: "Power Query Details: Strip '$' characters, cast to Float, and set negative invalid spend entries (-$50.00) to 0.00 absolute value.",
        status: "ACCEPTED",
        config: "Absolute Non-Negative Conversion"
    },
    {
        id: "STEP-04",
        name: "Text Standardization (Status Column)",
        type: "Consistency",
        description: "Power Query Details: Standardize categorical values ('active ', 'ACTIVE') into Title Case 'Active'.",
        status: "ACCEPTED",
        config: "Trim Spaces & Capitalize"
    }
];

// Navigation Logic
document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', function () {
        const step = this.getAttribute('data-step');
        switchStep(step);
    });
});

function switchStep(stepNumber) {
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));

    document.querySelector(`.nav-links li[data-step="${stepNumber}"]`).classList.add('active');
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

// Load Sample Dataset
document.getElementById('btn-load-sample').addEventListener('click', () => {
    renderRawTable(rawDataset);
    document.getElementById('dataset-preview-section').classList.remove('hidden');
    document.getElementById('row-count-badge').textContent = `${rawDataset.length} Records Loaded`;
});

function renderRawTable(data) {
    const table = document.getElementById('preview-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    let trHead = '<tr>';
    headers.forEach(h => trHead += `<th>${h.toUpperCase()}</th>`);
    trHead += '</tr>';
    thead.innerHTML = trHead;

    data.forEach((row, idx) => {
        let tr = '<tr>';
        headers.forEach(h => {
            let val = row[h];
            let cls = '';
            if (val === 'N/A' || val === 'NaN') cls = 'cell-missing';
            if (val.includes('-')) cls = 'cell-invalid';
            if (idx === 4) cls = 'cell-duplicate';
            tr += `<td class="${cls}">${val}</td>`;
        });
        tr += '</tr>';
        tbody.innerHTML += tr;
    });
}

// Flow Next Handlers
document.getElementById('btn-goto-step2').addEventListener('click', () => switchStep(2));
document.getElementById('btn-goto-step3').addEventListener('click', () => {
    renderHITLSteps();
    switchStep(3);
});

function renderHITLSteps() {
    const container = document.getElementById('steps-container');
    container.innerHTML = '';

    transformationSteps.forEach((step, index) => {
        const card = document.createElement('div');
        card.className = `step-card ${step.status.toLowerCase()}`;
        card.innerHTML = `
            <div class="step-card-header">
                <span class="step-title"><i class="fa-solid fa-gears"></i> ${step.id}: ${step.name}</span>
                <span class="badge">${step.type}</span>
            </div>
            <div class="power-query-desc">
                ${step.description}
            </div>
            <div class="step-actions">
                <button class="btn btn-accept" onclick="toggleStepStatus(${index}, 'ACCEPTED')">
                    <i class="fa-solid fa-check"></i> ${step.status === 'ACCEPTED' ? 'Accepted' : 'Accept Step'}
                </button>
                <button class="btn btn-reject" onclick="toggleStepStatus(${index}, 'REJECTED')">
                    <i class="fa-solid fa-xmark"></i> ${step.status === 'REJECTED' ? 'Stopped' : 'Stop Step'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.toggleStepStatus = function(index, newStatus) {
    transformationSteps[index].status = newStatus;
    renderHITLSteps();
};

document.getElementById('btn-execute-plan').addEventListener('click', () => {
    executeRemediationPipeline();
    switchStep(4);
});

function executeRemediationPipeline() {
    // Audit Trail Generation
    const auditTbody = document.getElementById('audit-table').querySelector('tbody');
    auditTbody.innerHTML = '';

    transformationSteps.forEach(step => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${step.id}</td>
            <td>${step.name}</td>
            <td><span class="badge" style="color: ${step.status === 'ACCEPTED' ? '#10b981' : '#ef4444'}">${step.status}</span></td>
            <td>${step.config}</td>
            <td>${new Date().toLocaleTimeString()}</td>
        `;
        auditTbody.appendChild(tr);
    });

    // Generate Processed Dataset
    const processedData = [
        { id: "101", name: "John Doe", age: "28", spend: "150.00", status: "Active", date: "2026-01-10" },
        { id: "102", name: "Jane Smith", age: "30", spend: "230.50", status: "Active", date: "2026-01-11" },
        { id: "103", name: "Robert Cheney", age: "45", spend: "0.00", status: "Inactive", date: "2026-01-12" },
        { id: "104", name: "Alice Brown", age: "31", spend: "500.00", status: "Active", date: "2026-01-13" },
        { id: "105", name: "Emily Davis", age: "30", spend: "80.20", status: "Pending", date: "2026-01-15" }
    ];

    renderProcessedTable(processedData);
}

function renderProcessedTable(data) {
    const table = document.getElementById('processed-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headers = Object.keys(data[0]);
    let trHead = '<tr>';
    headers.forEach(h => trHead += `<th>${h.toUpperCase()}</th>`);
    trHead += '</tr>';
    thead.innerHTML = trHead;

    data.forEach(row => {
        let tr = '<tr>';
        headers.forEach(h => tr += `<td>${row[h]}</td>`);
        tr += '</tr>';
        tbody.innerHTML += tr;
    });
}