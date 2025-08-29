// Client dashboard logic: upload to R2 via backend, score ATS locally (with optional API), store in Firestore
const db = firebase.firestore();
const auth = firebase.auth();

const ADMIN_EMAIL = "admin@devopify.com"; // keep in sync with login.html

document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(async (user) => {
  if (!user) window.location.href = "login.html";
  else {
    loadProfile(user.uid);
  }
});

async function loadProfile(uid) {
  const snap = await db.collection("students").doc(uid).get();
  if (!snap.exists) return;
  const data = snap.data();
  document.getElementById("profileCard").style.display = "block";
  document.getElementById("pName").textContent = data.name || "";
  document.getElementById("pClass").textContent = data.class || "";
  document.getElementById("pSem").textContent = data.semester || "";
  document.getElementById("pGit").href = data.github || data.githubLink || "#";
  document.getElementById("pLin").href = data.linkedin || data.linkedinLink || "#";
  document.getElementById("pATS").textContent = data.atsScore ?? "N/A";
  document.getElementById("pResume").href = data.resumeUrl || "#";
}

document.getElementById("detailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const name = document.getElementById("studentName").value.trim();
  const cls = document.getElementById("studentClass").value.trim();
  const sem = document.getElementById("studentSemester").value.trim();
  const github = document.getElementById("githubLink").value.trim();
  const linkedin = document.getElementById("linkedinLink").value.trim();
  const resumeFile = document.getElementById("resumeFile").files[0];

  if (!resumeFile) return alert("Please upload a PDF");
  if (resumeFile.type !== "application/pdf") return alert("Upload PDF only");

  try {
    // 1) Extract text for local ATS scoring
    const text = await extractTextFromPDF(resumeFile);
    // 2) Try external "free" ATS API (if you set it), else fall back to local scoring
    let atsScore;
    try {
      atsScore = await tryExternalATSAPI(text);
      if (typeof atsScore !== "number") throw new Error("Invalid ATS API response");
    } catch (_) {
      atsScore = await localATSScore(text);
    }

    // 3) Upload resume to Cloudflare R2 via backend
    const formDataUpload = new FormData();
    formDataUpload.append("resume", resumeFile);
    formDataUpload.append("uid", user.uid);
    const uploadResponse = await fetch("/upload", { method: "POST", body: formDataUpload });
    if (!uploadResponse.ok) throw new Error("Failed to upload resume to R2");
    const { resumeUrl } = await uploadResponse.json();

    // 4) Save metadata to Firestore
    const payload = {
      name,
      class: cls,
      semester: sem,
      githubLink: github,
      linkedinLink: linkedin,
      resumeUrl,
      atsScore,
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("students").doc(user.uid).set(payload, { merge: true });

    alert(`Saved! Your ATS Score: ${atsScore}/100`);
    loadProfile(user.uid);
  } catch (err) {
    console.error(err);
    alert("Failed: " + err.message);
  }
});

// ============ PDF text extraction using pdf.js =============
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

// ============ Optional free ATS API wrapper (if any) =============
// If you later find a free ATS scoring API, put its URL here or use backend /ats-score
const FREE_ATS_API_URL = ""; // leave blank to skip

async function tryExternalATSAPI(text) {
  if (!FREE_ATS_API_URL) throw new Error("No free ATS API configured");
  const res = await fetch(FREE_ATS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("ATS API error");
  const data = await res.json();
  // Expect API to return { score: number }
  return data.score;
}

// ============ Local ATS scoring (fallback) =============
async function localATSScore(text) {
  let score = 0;
  function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --- Skills (0–30) ---
  const skills = ["javascript","python","java","react","node","sql","aws","c++","html","css"];
  const found = skills.filter(s => {
  const regex = new RegExp(`\\b${escapeRegex(s)}\\b`, "i");
  return regex.test(text);
  }).length;
  score += Math.min(30, found * 3); // 3 pts per skill, up to 30

  // --- Education (0–15) ---
  let edu = 0;
  if (/bachelor|undergraduate|b\.sc|btech|b\.tech/i.test(text)) edu = Math.max(edu, 8);
  if (/master|postgraduate|m\.sc|mtech|m\.tech/i.test(text)) edu = Math.max(edu, 12);
  if (/ph\.?d|doctorate/i.test(text)) edu = Math.max(edu, 15);
  score += edu;

  // --- Projects (0–15) ---
  const projects = text.match(/\bprojects?\b/gi);
  score += Math.min(15, (projects ? projects.length : 0) * 5);

  // --- Experience (0–30) ---
  let expPts = 0;
  const expMatches = text.match(/(\d+)\+?\s+years?/gi);
  if (expMatches) {
    expPts += expMatches.reduce((sum, m) => {
      const n = parseInt(m);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }
  const currentYear = new Date().getFullYear();
  const yrRange = /(\b(19|20)\d{2})\s*(?:–|-|to)\s*(\b(19|20)\d{2}|present|current|now)/gi;
  let mt;
  while ((mt = yrRange.exec(text)) !== null) {
    const start = parseInt(mt[1]);
    let end = /present|current|now/i.test(mt[3]) ? currentYear : parseInt(mt[3]);
    if (!isNaN(start) && !isNaN(end) && end >= start) expPts += (end - start);
  }
  score += Math.min(30, expPts * 2); // 2 pts per year, capped at 30

  return Math.min(100, Math.round(score));
}
