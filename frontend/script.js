/* ============================================================
   EduGuard AI — Frontend Logic (3D Enhanced v2)
   ============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let lastUploadResults = [];
let allStudentsCache = [];


/* ============================================================
   LIVE CLOCK
   ============================================================ */

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    const sidebarClock = document.getElementById("sidebar-clock");
    const liveClock = document.getElementById("live-clock");

    if (sidebarClock) sidebarClock.textContent = timeStr;
    if (liveClock) liveClock.textContent = `${dateStr} • ${timeStr}`;
}

function updateHeroStats(students) {
    const total = students.length;
    const high = students.filter(s => s.risk === "HIGH").length;
    const interventions = students.reduce((sum, s) => sum + s.interventions.length, 0);

    const elTotal = document.getElementById("hero-stat-total");
    const elHigh = document.getElementById("hero-stat-high");
    const elInterventions = document.getElementById("hero-stat-interventions");

    if (elTotal) animateCounter(elTotal, total, "", 800);
    if (elHigh) animateCounter(elHigh, high, "", 800);
    if (elInterventions) animateCounter(elInterventions, interventions, "", 800);
}


/* ============================================================
   PARTICLE SYSTEM — Animated Background
   ============================================================ */

(function initParticles() {
    const canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    const PARTICLE_COUNT = 80;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.hue = Math.random() > 0.5 ? 240 : 190; // indigo or cyan
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
            ctx.fill();

            // Draw connections
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x, dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `hsla(240, 70%, 60%, ${0.06 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(drawParticles);
    }
    drawParticles();
})();


/* ============================================================
   3D CARD TILT EFFECT (Mouse Tracking)
   ============================================================ */

document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".card-3d").forEach(card => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) / rect.width;
        const deltaY = (e.clientY - centerY) / rect.height;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (dist < 1.5) {
            card.style.transform = `perspective(1000px) rotateY(${deltaX * 4}deg) rotateX(${-deltaY * 4}deg) translateY(-2px)`;
        } else {
            card.style.transform = '';
        }
    });
});


/* ============================================================
   DRAGGABLE DASHBOARD WIDGETS
   ============================================================ */

let draggedWidget = null;
let dragOffsetX = 0, dragOffsetY = 0;

document.addEventListener("mousedown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    const widget = handle.closest(".draggable-widget");
    if (!widget) return;

    draggedWidget = widget;
    const rect = widget.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    widget.classList.add("dragging");
    widget.style.position = "relative";
    widget.style.zIndex = "999";
    e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
    if (!draggedWidget) return;
    const parent = draggedWidget.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const x = e.clientX - parentRect.left - dragOffsetX;
    const y = e.clientY - parentRect.top - dragOffsetY;
    draggedWidget.style.left = x + "px";
    draggedWidget.style.top = y + "px";
});

document.addEventListener("mouseup", () => {
    if (draggedWidget) {
        draggedWidget.classList.remove("dragging");
        // Snap back with animation
        draggedWidget.style.transition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        draggedWidget.style.left = "0px";
        draggedWidget.style.top = "0px";
        draggedWidget.style.zIndex = "";
        setTimeout(() => {
            if (draggedWidget) {
                draggedWidget.style.position = "";
                draggedWidget.style.transition = "";
            }
            draggedWidget = null;
        }, 400);
    }
});


/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */

function animateCounter(element, target, suffix = "", duration = 1200) {
    const start = 0;
    const startTime = performance.now();
    const isFloat = String(target).includes(".");

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;
        element.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function switchPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

    const page = document.getElementById(`page-${pageId}`);
    const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);

    if (page) page.classList.add("active");
    if (btn) btn.classList.add("active");

    if (pageId === "dashboard") loadDashboard();
    if (pageId === "students") loadAllStudents();
    if (pageId === "explainable") loadExplainableAI();
    if (pageId === "interventions") loadInterventions();
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


/* ============================================================
   SLIDER LABEL
   ============================================================ */

function updateSliderLabel(el) {
    const valSpan = document.getElementById(el.id + "-val");
    if (valSpan) {
        valSpan.textContent = parseFloat(el.value).toFixed(el.step && el.step < 1 ? 2 : 0);
    }
}


/* ============================================================
   TABLE BUILDER
   ============================================================ */

function buildTable(headers, rows) {
    let html = "<div class='table-wrapper'><table><thead><tr>";
    headers.forEach(h => html += `<th>${h}</th>`);
    html += "</tr></thead><tbody>";
    rows.forEach(row => {
        html += "<tr>";
        row.forEach(cell => html += `<td>${cell}</td>`);
        html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
}

function riskBadge(risk) {
    return `<span class="risk-badge ${risk}">${risk}</span>`;
}


/* ============================================================
   API HELPERS
   ============================================================ */

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "API error");
    }
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "API error");
    }
    return res.json();
}

async function apiUpload(path, file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "API error");
    }
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "API error");
    }
    return res.json();
}

async function clearAllData() {
    if (!confirm("Are you sure you want to clear all student data? This action cannot be undone.")) return;
    try {
        await apiDelete("/api/students");
        showToast("All student data cleared successfully.", "success");
        allStudentsCache = [];
        lastUploadResults = [];
        
        // Reset dashboard counters explicitly
        const elTotal = document.getElementById("hero-stat-total");
        const elHigh = document.getElementById("hero-stat-high");
        const elInterventions = document.getElementById("hero-stat-interventions");
        if (elTotal) elTotal.textContent = "0";
        if (elHigh) elHigh.textContent = "0";
        if (elInterventions) elInterventions.textContent = "0";

        loadDashboard();
        if (document.getElementById("page-students").classList.contains("active")) loadAllStudents();
        if (document.getElementById("page-interventions").classList.contains("active")) loadInterventions();
    } catch (err) {
        showToast("Failed to clear data: " + err.message, "error");
    }
}


/* ============================================================
   PLOTLY 3D DEFAULTS
   ============================================================ */

const DARK_3D_LAYOUT = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Inter", color: "#94a3b8", size: 11 },
    margin: { t: 10, b: 10, l: 10, r: 10 },
    scene: {
        bgcolor: "rgba(0,0,0,0)",
        xaxis: { gridcolor: "rgba(99,102,241,0.08)", zerolinecolor: "rgba(99,102,241,0.12)", title: { font: { size: 11 } } },
        yaxis: { gridcolor: "rgba(99,102,241,0.08)", zerolinecolor: "rgba(99,102,241,0.12)", title: { font: { size: 11 } } },
        zaxis: { gridcolor: "rgba(99,102,241,0.08)", zerolinecolor: "rgba(99,102,241,0.12)", title: { font: { size: 11 } } },
        camera: { eye: { x: 1.6, y: 1.6, z: 1.2 } },
    },
};

const PLOT_CONFIG = { displayModeBar: false, responsive: true };
const RISK_COLORS = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };


/* ============================================================
   PAGE: PREDICT
   ============================================================ */

async function handlePredict(e) {
    e.preventDefault();

    const name = document.getElementById("inp-name").value.trim();
    if (!name) { showToast("Please enter the student's name.", "error"); return; }

    const btn = document.getElementById("predict-btn");
    btn.classList.add("loading");
    btn.disabled = true;

    const payload = {
        "Name": name,
        "Attendance": parseFloat(document.getElementById("inp-attendance").value),
        "Academic Score": parseFloat(document.getElementById("inp-academic").value),
        "Assignment Rate": parseFloat(document.getElementById("inp-assignment").value),
        "Participation": parseFloat(document.getElementById("inp-participation").value),
        "Socio-Economic": parseFloat(document.getElementById("inp-socio").value),
        "Backlogs": parseInt(document.getElementById("inp-backlogs").value),
    };

    try {
        const result = await apiPost("/api/predict", payload);
        renderPredictResults(result);
        showToast(`Prediction complete for ${result.name}`, "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

function renderPredictResults(r) {
    const container = document.getElementById("predict-results");
    container.style.display = "block";

    const pct = (r.probability * 100).toFixed(1);
    const riskColor = RISK_COLORS[r.risk];

    // Metrics
    document.getElementById("predict-metrics").innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Dropout Probability</div>
            <div class="metric-value" style="background:linear-gradient(135deg, ${riskColor}, #fff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${pct}%</div>
        </div>
        <div class="metric-card ${r.risk.toLowerCase()}">
            <div class="metric-label">Risk Level</div>
            <div class="metric-value" style="-webkit-text-fill-color:unset;">${riskBadge(r.risk)}</div>
        </div>
    `;

    // Profile table
    const FEATURE_NAMES = ["Attendance", "Academic Score", "Assignment Rate", "Participation", "Socio-Economic", "Backlogs"];
    const values = [
        `${r.attendance}%`, `${r.academic_score}%`, `${r.assignment_rate}%`,
        `${r.participation}/10`, r.socio_economic.toFixed(2), r.backlogs.toString()
    ];
    document.getElementById("student-profile-table").innerHTML =
        buildTable(["Feature", "Value"], FEATURE_NAMES.map((f, i) => [f, values[i]]));

    // 3D Risk Gauge (3D Pie)
    Plotly.newPlot("chart-risk-pie", [{
        labels: ["Dropout Risk", "Likely to Continue"],
        values: [parseFloat(pct), 100 - parseFloat(pct)],
        hole: 0.5, type: "pie", sort: false,
        pull: [0.05, 0],
        marker: {
            colors: [riskColor, "rgba(255,255,255,0.04)"],
            line: { color: "rgba(255,255,255,0.1)", width: 1 },
        },
        textinfo: "label+percent",
        textfont: { color: "#f1f5f9", size: 12 },
        rotation: -45,
    }], {
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        font: { family: "Inter", color: "#94a3b8" },
        height: 340, showlegend: false,
        margin: { t: 10, b: 10, l: 10, r: 10 },
        annotations: [{
            text: `<b>${pct}%</b>`, x: 0.5, y: 0.5,
            font: { size: 32, color: riskColor }, showarrow: false,
        }],
    }, PLOT_CONFIG);

    // 3D Radar / Polar Feature Chart
    const normValues = r.normalized_features.map(v => +(v * 100).toFixed(1));
    Plotly.newPlot("chart-feature-bar", [{
        type: "scatterpolar",
        r: [...normValues, normValues[0]],
        theta: [...FEATURE_NAMES, FEATURE_NAMES[0]],
        fill: "toself",
        fillcolor: "rgba(99, 102, 241, 0.15)",
        line: { color: "#818cf8", width: 2 },
        marker: { color: "#6366f1", size: 8 },
        name: r.name,
    }], {
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        font: { family: "Inter", color: "#94a3b8", size: 11 },
        height: 340,
        margin: { t: 30, b: 30, l: 60, r: 60 },
        polar: {
            bgcolor: "rgba(0,0,0,0)",
            radialaxis: {
                visible: true, range: [0, 100],
                gridcolor: "rgba(99,102,241,0.1)",
                linecolor: "rgba(99,102,241,0.15)",
                tickfont: { color: "#64748b", size: 10 },
            },
            angularaxis: {
                gridcolor: "rgba(99,102,241,0.08)",
                linecolor: "rgba(99,102,241,0.12)",
                tickfont: { color: "#94a3b8", size: 11 },
            },
        },
        showlegend: false,
    }, PLOT_CONFIG);

    // Interventions
    const intHtml = r.interventions.map(i => `
        <div class="intervention-card">
            <div class="intervention-area">${i.area}</div>
            <div class="intervention-action">${i.action}</div>
        </div>
    `).join("");
    document.getElementById("predict-interventions").innerHTML = intHtml;

    container.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */

async function loadDashboard() {
    try {
        const students = await apiGet("/api/students");
        const emptyEl = document.getElementById("dashboard-empty");
        const contentEl = document.getElementById("dashboard-content");

        // Always update hero stats
        updateHeroStats(students);

        if (students.length === 0) {
            emptyEl.style.display = "block";
            contentEl.style.display = "none";
            return;
        }

        emptyEl.style.display = "none";
        contentEl.style.display = "block";

        const total = students.length;
        const high = students.filter(s => s.risk === "HIGH").length;
        const medium = students.filter(s => s.risk === "MEDIUM").length;
        const low = students.filter(s => s.risk === "LOW").length;
        const overallPct = total > 0 ? ((high / total) * 100) : 0;

        // Animated Metric Cards
        document.getElementById("dashboard-metrics").innerHTML = `
            <div class="metric-card">
                <div class="metric-label">Total Students</div>
                <div class="metric-value"><span id="cnt-total">0</span></div>
            </div>
            <div class="metric-card high">
                <div class="metric-label">🔴 High Risk</div>
                <div class="metric-value"><span id="cnt-high">0</span></div>
            </div>
            <div class="metric-card medium">
                <div class="metric-label">🟠 Medium Risk</div>
                <div class="metric-value"><span id="cnt-medium">0</span></div>
            </div>
            <div class="metric-card low">
                <div class="metric-label">🟢 Low Risk</div>
                <div class="metric-value"><span id="cnt-low">0</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Overall Dropout Rate</div>
                <div class="metric-value"><span id="cnt-rate">0</span></div>
            </div>
        `;

        // Animate counters
        setTimeout(() => {
            animateCounter(document.getElementById("cnt-total"), total);
            animateCounter(document.getElementById("cnt-high"), high);
            animateCounter(document.getElementById("cnt-medium"), medium);
            animateCounter(document.getElementById("cnt-low"), low);
            animateCounter(document.getElementById("cnt-rate"), overallPct, "%");
        }, 100);


        // ---- 3D Scatter ----
        render3DScatter("chart-3d-scatter", students);

        // ---- 3D Risk Distribution (3D Bar) ----
        Plotly.newPlot("chart-risk-dist", [{
            x: ["LOW", "MEDIUM", "HIGH"],
            y: ["Risk"],
            z: [[low, medium, high]],
            type: "surface",
            colorscale: [
                [0, "#22c55e"],
                [0.5, "#f59e0b"],
                [1, "#ef4444"],
            ],
            showscale: false,
            opacity: 0.9,
            contours: {
                z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: true } },
            },
        }], {
            ...DARK_3D_LAYOUT,
            height: 380,
            scene: {
                ...DARK_3D_LAYOUT.scene,
                xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Risk Level" },
                yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "" },
                zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "Count" },
                camera: { eye: { x: 1.8, y: 1.2, z: 1.0 } },
            },
        }, PLOT_CONFIG);

        // ---- 3D Probability Landscape (3D Bars) ----
        const probNames = students.map(s => s.name);
        const probValues = students.map(s => +(s.probability * 100).toFixed(1));
        const probColors = students.map(s => RISK_COLORS[s.risk]);

        Plotly.newPlot("chart-prob-bar", [{
            x: probNames,
            y: probValues,
            z: students.map(s => s.attendance),
            type: "scatter3d",
            mode: "markers+text",
            marker: {
                size: probValues.map(v => Math.max(6, v / 6)),
                color: probValues,
                colorscale: [[0, "#22c55e"], [0.5, "#f59e0b"], [1, "#ef4444"]],
                opacity: 0.85,
                line: { width: 1, color: "rgba(255,255,255,0.15)" },
                showscale: true,
                colorbar: {
                    title: { text: "Risk %", font: { color: "#94a3b8", size: 11 } },
                    tickfont: { color: "#64748b" },
                    thickness: 12, len: 0.6,
                },
            },
            text: probNames,
            hovertemplate: "<b>%{text}</b><br>Dropout: %{y:.1f}%<br>Attendance: %{z}%<extra></extra>",
        }], {
            ...DARK_3D_LAYOUT,
            height: 380,
            scene: {
                ...DARK_3D_LAYOUT.scene,
                xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Student" },
                yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "Dropout Prob (%)" },
                zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "Attendance (%)" },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
            },
        }, PLOT_CONFIG);


        // ---- 3D Risk Surface Heatmap ----
        renderRiskSurface("chart-risk-surface", students);


        // ---- Radar Chart ----
        const avgByRisk = (field, risk) => {
            const arr = students.filter(s => s.risk === risk);
            return arr.length > 0 ? arr.reduce((sum, s) => sum + s[field], 0) / arr.length : 0;
        };
        const radarFeatures = ["attendance", "academic_score", "assignment_rate", "participation", "socio_economic", "backlogs"];
        const radarLabels = ["Attendance", "Academic", "Assignments", "Participation", "Socio-Eco", "Backlogs"];
        const radarTraces = [];

        for (const risk of ["LOW", "MEDIUM", "HIGH"]) {
            const riskStudents = students.filter(s => s.risk === risk);
            if (riskStudents.length === 0) continue;

            const vals = radarFeatures.map(f => {
                const avg = riskStudents.reduce((sum, s) => sum + s[f], 0) / riskStudents.length;
                if (f === "attendance" || f === "academic_score" || f === "assignment_rate") return avg;
                if (f === "participation") return avg * 10;
                if (f === "socio_economic") return avg * 100;
                if (f === "backlogs") return avg * 20;
                return avg;
            });

            radarTraces.push({
                type: "scatterpolar",
                r: [...vals, vals[0]],
                theta: [...radarLabels, radarLabels[0]],
                fill: "toself",
                fillcolor: RISK_COLORS[risk] + "18",
                line: { color: RISK_COLORS[risk], width: 2 },
                marker: { size: 6, color: RISK_COLORS[risk] },
                name: risk,
            });
        }

        Plotly.newPlot("chart-risk-radar", radarTraces, {
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Inter", color: "#94a3b8", size: 11 },
            height: 400, margin: { t: 30, b: 30, l: 60, r: 60 },
            polar: {
                bgcolor: "rgba(0,0,0,0)",
                radialaxis: {
                    visible: true, range: [0, 100],
                    gridcolor: "rgba(99,102,241,0.08)",
                    tickfont: { color: "#64748b", size: 10 },
                },
                angularaxis: {
                    gridcolor: "rgba(99,102,241,0.06)",
                    tickfont: { color: "#94a3b8", size: 11 },
                },
            },
            legend: { font: { color: "#94a3b8" }, bgcolor: "transparent" },
            showlegend: true,
        }, PLOT_CONFIG);

        // ---- 3D Feature Funnel ----
        const featureImportance = radarLabels.map((label, i) => {
            const vals = students.map(s => {
                const v = s[radarFeatures[i]];
                if (radarFeatures[i] === "attendance" || radarFeatures[i] === "academic_score" || radarFeatures[i] === "assignment_rate") return v;
                if (radarFeatures[i] === "participation") return v * 10;
                if (radarFeatures[i] === "socio_economic") return v * 100;
                return v * 20;
            });
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            return { label, avg };
        }).sort((a, b) => b.avg - a.avg);

        Plotly.newPlot("chart-feature-funnel", [{
            type: "funnel",
            y: featureImportance.map(f => f.label),
            x: featureImportance.map(f => +f.avg.toFixed(1)),
            textinfo: "value+percent total",
            textfont: { color: "#f1f5f9", size: 12 },
            marker: {
                color: featureImportance.map((_, i) => {
                    const hue = 240 + i * 20;
                    return `hsla(${hue}, 70%, 60%, 0.8)`;
                }),
                line: { color: "rgba(255,255,255,0.1)", width: 1 },
            },
            connector: { line: { color: "rgba(99,102,241,0.2)", width: 1 } },
        }], {
            paper_bgcolor: "transparent", plot_bgcolor: "transparent",
            font: { family: "Inter", color: "#94a3b8", size: 11 },
            height: 400,
            margin: { t: 10, b: 10, l: 120, r: 20 },
            showlegend: false,
        }, PLOT_CONFIG);


        // ---- High-risk table ----
        const highRisk = students.filter(s => s.risk === "HIGH");
        if (highRisk.length > 0) {
            const rows = highRisk.map(s => [
                s.name, s.attendance, s.academic_score, s.backlogs,
                `${(s.probability * 100).toFixed(1)}%`, riskBadge(s.risk)
            ]);
            document.getElementById("high-risk-table-container").innerHTML =
                buildTable(["Name", "Attendance", "Academic Score", "Backlogs", "Probability", "Risk"], rows);
        } else {
            document.getElementById("high-risk-table-container").innerHTML =
                `<div class="info-box" style="text-align:center;">✅ No high-risk students detected.</div>`;
        }

    } catch (err) {
        showToast("Failed to load dashboard: " + err.message, "error");
    }
}


/* ============================================================
   3D RISK SURFACE HEATMAP
   ============================================================ */

function renderRiskSurface(containerId, students) {
    // Create a surface based on Attendance vs Academic Score
    const attRange = []; for (let a = 0; a <= 100; a += 5) attRange.push(a);
    const acadRange = []; for (let a = 0; a <= 100; a += 5) acadRange.push(a);

    const zData = attRange.map(att => {
        return acadRange.map(acad => {
            // Simple heuristic for surface: average of nearby students or distance formula
            let totalWeight = 0, totalRisk = 0;
            students.forEach(s => {
                const dist = Math.sqrt(Math.pow(s.attendance - att, 2) + Math.pow(s.academic_score - acad, 2));
                const w = 1 / (dist + 10);
                totalWeight += w;
                totalRisk += w * s.probability;
            });
            return totalWeight > 0 ? (totalRisk / totalWeight * 100) : 0;
        });
    });

    Plotly.newPlot(containerId, [{
        z: zData,
        x: acadRange,
        y: attRange,
        type: "surface",
        colorscale: [
            [0, "rgba(34,197,94,0.8)"],
            [0.3, "rgba(34,197,94,0.6)"],
            [0.5, "rgba(245,158,11,0.7)"],
            [0.7, "rgba(239,68,68,0.6)"],
            [1, "rgba(239,68,68,0.9)"],
        ],
        opacity: 0.88,
        contours: {
            z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: true } },
            x: { show: false },
            y: { show: false },
        },
        lighting: {
            ambient: 0.7,
            diffuse: 0.8,
            specular: 0.3,
            roughness: 0.5,
        },
        colorbar: {
            title: { text: "Risk %", font: { color: "#94a3b8", size: 11 } },
            tickfont: { color: "#64748b" },
            thickness: 14, len: 0.6,
        },
    }, {
        // Overlay student points
        x: students.map(s => s.academic_score),
        y: students.map(s => s.attendance),
        z: students.map(s => s.probability * 100 + 1),
        type: "scatter3d",
        mode: "markers",
        marker: {
            size: 6,
            color: students.map(s => RISK_COLORS[s.risk]),
            line: { width: 1, color: "white" },
        },
        text: students.map(s => `${s.name}: ${(s.probability * 100).toFixed(1)}%`),
        hovertemplate: "<b>%{text}</b><extra></extra>",
        name: "Students",
    }], {
        ...DARK_3D_LAYOUT,
        height: 500,
        scene: {
            ...DARK_3D_LAYOUT.scene,
            xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Academic Score (%)" },
            yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "Attendance (%)" },
            zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "Dropout Risk (%)" },
            camera: { eye: { x: 1.4, y: 1.4, z: 1.0 } },
        },
        showlegend: false,
    }, PLOT_CONFIG);
}


/* ============================================================
   3D SCATTER (Enhanced)
   ============================================================ */

function render3DScatter(containerId, students) {
    const groups = { LOW: [], MEDIUM: [], HIGH: [] };
    students.forEach(s => {
        const group = groups[s.risk] || groups.HIGH;
        group.push(s);
    });

    const traces = Object.entries(groups).filter(([, arr]) => arr.length > 0).map(([risk, arr]) => ({
        x: arr.map(s => s.attendance),
        y: arr.map(s => s.academic_score),
        z: arr.map(s => s.backlogs),
        text: arr.map(s => s.name),
        name: risk,
        mode: "markers",
        type: "scatter3d",
        marker: {
            size: arr.map(s => 6 + s.probability * 12),
            color: RISK_COLORS[risk],
            opacity: 0.85,
            line: { width: 0.8, color: "rgba(255,255,255,0.25)" },
            symbol: "diamond",
        },
        hovertemplate: "<b>%{text}</b><br>Attendance: %{x}%<br>Academic: %{y}%<br>Backlogs: %{z}<extra></extra>",
    }));

    Plotly.newPlot(containerId, traces, {
        ...DARK_3D_LAYOUT,
        height: 520,
        scene: {
            ...DARK_3D_LAYOUT.scene,
            xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Attendance (%)" },
            yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "Academic Score (%)" },
            zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "Backlogs" },
            camera: { eye: { x: 1.7, y: 1.7, z: 1.1 } },
        },
        legend: { font: { color: "#94a3b8" }, bgcolor: "transparent" },
    }, PLOT_CONFIG);
}


/* ============================================================
   PAGE: ALL STUDENTS
   ============================================================ */

async function loadAllStudents() {
    try {
        const students = await apiGet("/api/students");
        allStudentsCache = students;

        const emptyEl = document.getElementById("students-empty");
        const contentEl = document.getElementById("students-content");

        if (students.length === 0) {
            emptyEl.style.display = "block";
            contentEl.style.display = "none";
            return;
        }

        emptyEl.style.display = "none";
        contentEl.style.display = "block";

        const rows = students.map(s => [
            s.name, s.attendance, s.academic_score, s.assignment_rate,
            s.participation, s.socio_economic.toFixed(2), s.backlogs,
            `${(s.probability * 100).toFixed(1)}%`, riskBadge(s.risk)
        ]);
        document.getElementById("all-students-table").innerHTML =
            buildTable(["Name", "Attendance", "Academic", "Assignment", "Participation", "Socio-Eco", "Backlogs", "Dropout %", "Risk"], rows);

    } catch (err) {
        showToast("Failed to load students: " + err.message, "error");
    }
}

function downloadStudentReport() {
    if (allStudentsCache.length === 0) { showToast("No data to download.", "error"); return; }
    const header = "Name,Attendance,Academic Score,Assignment Rate,Participation,Socio-Economic,Backlogs,Dropout Probability (%),Risk\n";
    const csv = header + allStudentsCache.map(s =>
        `${s.name},${s.attendance},${s.academic_score},${s.assignment_rate},${s.participation},${s.socio_economic},${s.backlogs},${(s.probability * 100).toFixed(1)},${s.risk}`
    ).join("\n");
    downloadCSV(csv, "eduguard_student_report.csv");
}


/* ============================================================
   PAGE: EXPLAINABLE AI (3D)
   ============================================================ */

async function loadExplainableAI() {
    try {
        const [correlations, weights] = await Promise.all([
            apiGet("/api/correlations"),
            apiGet("/api/weights"),
        ]);

        // Correlation Table
        const corrRows = correlations.map(c => [c.feature, c.correlation.toFixed(4)]);
        document.getElementById("correlation-table").innerHTML = buildTable(["Feature", "Correlation"], corrRows);

        // 3D Correlation Visualization
        const features = correlations.map(c => c.feature);
        const corrValues = correlations.map(c => c.correlation);
        const absValues = correlations.map(c => c.absolute_correlation);

        Plotly.newPlot("chart-correlation", [{
            x: features,
            y: corrValues,
            z: absValues,
            type: "scatter3d",
            mode: "markers+lines",
            marker: {
                size: absValues.map(v => 8 + v * 20),
                color: corrValues,
                colorscale: [[0, "#22c55e"], [0.5, "#f59e0b"], [1, "#ef4444"]],
                opacity: 0.9,
                line: { width: 1, color: "rgba(255,255,255,0.2)" },
                showscale: true,
                colorbar: {
                    title: { text: "Correlation", font: { color: "#94a3b8" } },
                    tickfont: { color: "#64748b" }, thickness: 12,
                },
            },
            line: { color: "rgba(99,102,241,0.4)", width: 3 },
            text: features.map((f, i) => `${f}: ${corrValues[i].toFixed(3)}`),
            hovertemplate: "<b>%{text}</b><extra></extra>",
        }], {
            ...DARK_3D_LAYOUT,
            height: 420,
            scene: {
                ...DARK_3D_LAYOUT.scene,
                xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Feature" },
                yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "Correlation" },
                zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "Absolute Correlation" },
                camera: { eye: { x: 2.0, y: 1.5, z: 1.0 } },
            },
        }, PLOT_CONFIG);

        // Weights Table
        const wRows = weights.map(w => [w.feature, w.weight.toFixed(4)]);
        document.getElementById("weights-table").innerHTML = buildTable(["Feature", "Model Weight"], wRows);

        // 3D Model Weights Surface
        const weightFeatures = weights.map(w => w.feature);
        const weightValues = weights.map(w => w.weight);

        Plotly.newPlot("chart-weights-3d", [{
            x: weightFeatures,
            y: weightValues,
            z: weightValues.map(w => Math.abs(w)),
            type: "scatter3d",
            mode: "markers+text",
            text: weightFeatures,
            textposition: "top center",
            textfont: { color: "#94a3b8", size: 10 },
            marker: {
                size: weightValues.map(w => 8 + Math.abs(w) * 4),
                color: weightValues,
                colorscale: [[0, "#22c55e"], [0.5, "#818cf8"], [1, "#ef4444"]],
                opacity: 0.9,
                symbol: "diamond",
                line: { width: 1, color: "rgba(255,255,255,0.2)" },
                showscale: true,
                colorbar: {
                    title: { text: "Weight", font: { color: "#94a3b8" } },
                    tickfont: { color: "#64748b" }, thickness: 12,
                },
            },
            hovertemplate: "<b>%{x}</b><br>Weight: %{y:.4f}<extra></extra>",
        }, {
            // Stem lines from 0
            type: "scatter3d", mode: "lines",
            x: weightFeatures.flatMap(f => [f, f, f]),
            y: weightValues.flatMap(w => [0, w, null]),
            z: weightValues.flatMap(w => [0, Math.abs(w), null]),
            line: { color: "rgba(99,102,241,0.4)", width: 3 },
            showlegend: false, hoverinfo: "skip",
        }], {
            ...DARK_3D_LAYOUT,
            height: 420,
            scene: {
                ...DARK_3D_LAYOUT.scene,
                xaxis: { ...DARK_3D_LAYOUT.scene.xaxis, title: "Feature" },
                yaxis: { ...DARK_3D_LAYOUT.scene.yaxis, title: "Weight" },
                zaxis: { ...DARK_3D_LAYOUT.scene.zaxis, title: "|Weight|" },
                camera: { eye: { x: 2.0, y: 1.2, z: 1.0 } },
            },
            showlegend: false,
        }, PLOT_CONFIG);

    } catch (err) {
        showToast("Failed to load Explainable AI data: " + err.message, "error");
    }
}


/* ============================================================
   PAGE: INTERVENTIONS
   ============================================================ */

async function loadInterventions() {
    try {
        const students = await apiGet("/api/students");

        const emptyEl = document.getElementById("interventions-empty");
        const contentEl = document.getElementById("interventions-content");

        if (students.length === 0) {
            emptyEl.style.display = "block";
            contentEl.innerHTML = "";
            return;
        }

        emptyEl.style.display = "none";

        const html = students.map(s => {
            const pct = (s.probability * 100).toFixed(1);
            const interventionsHtml = s.interventions.map(i => `
                <div class="intervention-card">
                    <div class="intervention-area">${i.area}</div>
                    <div class="intervention-action">${i.action}</div>
                </div>
            `).join("");

            return `
                <div class="expander" onclick="toggleExpander(this)">
                    <div class="expander-header">
                        <span>${s.name} — ${riskBadge(s.risk)} — ${pct}%</span>
                        <span class="expander-arrow">▼</span>
                    </div>
                    <div class="expander-body">${interventionsHtml}</div>
                </div>
            `;
        }).join("");

        contentEl.innerHTML = html;

    } catch (err) {
        showToast("Failed to load interventions: " + err.message, "error");
    }
}

function toggleExpander(el) {
    el.classList.toggle("open");
}


/* ============================================================
   PAGE: UPLOAD
   ============================================================ */

let selectedFile = null;

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files.length > 0) selectFile(files[0]);
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) selectFile(e.target.files[0]);
}

function selectFile(file) {
    if (!file.name.endsWith(".csv")) {
        showToast("Only CSV files are supported.", "error");
        return;
    }
    selectedFile = file;
    document.getElementById("upload-filename").textContent = `📄 ${file.name}`;
    document.getElementById("upload-filename").classList.add("selected");
    document.getElementById("upload-btn").disabled = false;
}

async function handleUpload() {
    if (!selectedFile) { showToast("Please select a CSV file first.", "error"); return; }

    const btn = document.getElementById("upload-btn");
    btn.classList.add("loading");
    btn.disabled = true;

    try {
        const results = await apiUpload("/api/upload", selectedFile);
        lastUploadResults = results;

        const container = document.getElementById("upload-results");
        container.style.display = "block";

        const total = results.length;
        const high = results.filter(r => r.risk === "HIGH").length;
        const overallPct = total > 0 ? ((high / total) * 100).toFixed(1) : "0.0";

        document.getElementById("upload-metrics").innerHTML = `
            <div class="metric-card"><div class="metric-label">Total Students Analyzed</div><div class="metric-value">${total}</div></div>
            <div class="metric-card high"><div class="metric-label">High-Risk Count</div><div class="metric-value">${high}</div></div>
            <div class="metric-card"><div class="metric-label">Overall High Risk Rate</div><div class="metric-value">${overallPct}%</div></div>
        `;

        render3DScatter("chart-upload-3d", results);

        const rows = results.map(r => [
            r.name, `${(r.probability * 100).toFixed(2)}%`, riskBadge(r.risk)
        ]);
        document.getElementById("upload-table").innerHTML =
            buildTable(["Name", "Dropout Probability (%)", "Risk"], rows);

        showToast(`Successfully analyzed ${total} students!`, "success");
        container.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

function downloadUploadResults() {
    if (lastUploadResults.length === 0) { showToast("No data to download.", "error"); return; }
    const header = "Name,Dropout Probability (%),Risk\n";
    const csv = header + lastUploadResults.map(r =>
        `${r.name},${(r.probability * 100).toFixed(2)},${r.risk}`
    ).join("\n");
    downloadCSV(csv, "eduguard_predictions.csv");
}


/* ============================================================
   CSV DOWNLOAD HELPER
   ============================================================ */

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, "success");
}


/* ============================================================
   INITIAL LOAD
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    updateClock();
    setInterval(updateClock, 1000);
});
