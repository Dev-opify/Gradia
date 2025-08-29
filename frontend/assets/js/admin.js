const db = firebase.firestore();
const auth = firebase.auth();

document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

let students = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return (window.location.href = "login.html?admin=true");
  const ADMIN_EMAIL = "admin@devopify.com"; // change in prod
  if (user.email !== ADMIN_EMAIL) {
    alert("Unauthorized admin");
    return firebase.auth().signOut();
  }
  await loadAdminDashboard();
});

async function loadAdminDashboard() {
  const snap = await db.collection("students").get();
  students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  updateAdminStats();
  populateClassFilter();
  displayStudents(students);

  document.getElementById("classFilter").addEventListener("change", filterStudents);
  document.getElementById("semesterFilter").addEventListener("change", filterStudents);
  document.getElementById("searchStudent").addEventListener("input", debounce(filterStudents, 200));

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("studentModal").close();
  });
}

function updateAdminStats() {
  const total = students.length;
  const avg = total ? Math.round(students.reduce((s, x) => s + (x.atsScore || 0), 0) / total) : 0;
  document.getElementById("totalStudents").textContent = total;
  document.getElementById("avgATSScore").textContent = avg;
}

function populateClassFilter() {
  const classes = [...new Set(students.map(s => s.class).filter(Boolean))];
  const sel = document.getElementById("classFilter");
  sel.innerHTML = `<option value="">All Classes</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join("");
}

function displayStudents(list) {
  const el = document.getElementById("studentsList");
  el.innerHTML = "";
  list.forEach(s => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>${s.name || "-"}</strong>
        <div class="muted tiny">${s.class || "-"} • Sem ${s.semester || "-"}</div>
      </div>
      <div>ATS: <strong>${s.atsScore ?? "N/A"}</strong> <button class="btn ghost sm" data-id="${s.id}">View</button></div>
    `;
    div.querySelector("button").addEventListener("click", () => openStudentModal(s));
    el.appendChild(div);
  });
}

function filterStudents() {
  const cls = document.getElementById("classFilter").value;
  const sem = document.getElementById("semesterFilter").value;
  const q = (document.getElementById("searchStudent").value || "").toLowerCase();

  let list = students.filter(s => {
    const okClass = !cls || s.class === cls;
    const okSem = !sem || String(s.semester) === String(sem);
    const okQ = !q || (s.name || "").toLowerCase().includes(q) || (s.class || "").toLowerCase().includes(q);
    return okClass && okSem && okQ;
  });

  displayStudents(list);

  // Selected class average
  const classStudents = cls ? students.filter(s => s.class === cls) : [];
  const classAvg = classStudents.length ? Math.round(classStudents.reduce((sum, s) => sum + (s.atsScore || 0), 0) / classStudents.length) : 0;
  document.getElementById("selectedClassAvg").textContent = cls ? classAvg : 0;
}

function openStudentModal(s) {
  const modal = document.getElementById("studentModal");
  const ghUser = extractGithubUsername(s.githubLink);
  document.getElementById("modalStudentName").textContent = s.name || "-";
  document.getElementById("modalStudentDetails").innerHTML = `
    <div class="profile-section">
      <div>
        <p><strong>Email:</strong> ${s.email || "-"}</p>
        <p><strong>Class:</strong> ${s.class || "-"}</p>
        <p><strong>Semester:</strong> ${s.semester || "-"}</p>
        <p><strong>ATS Score:</strong> ${s.atsScore ?? "N/A"}/100</p>
        <div class="profile-links">
          ${s.githubLink ? `<a href="${s.githubLink}" target="_blank">GitHub</a>` : ""}
          ${s.linkedinLink ? ` | <a href="${s.linkedinLink}" target="_blank">LinkedIn</a>` : ""}
        </div>
      </div>
      <div style="margin-top:10px;">
        ${s.resumeUrl ? `<iframe src="${s.resumeUrl}" class="resume-viewer"></iframe>` : '<p>Resume not available</p>'}
      </div>
    </div>
    <div class="github-calendar">
      <h4>GitHub Activity (${new Date().getFullYear()})</h4>
      <div id="githubCalendar"><p>Loading GitHub activity${ghUser ? ` for ${ghUser}` : ""}...</p></div>
    </div>
  `;
  modal.showModal();
  if (ghUser) loadGithubCalendar(ghUser);
}

function extractGithubUsername(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^\/?#]+)/i);
  return m ? m[1] : null;
}

function debounce(fn, wait) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
