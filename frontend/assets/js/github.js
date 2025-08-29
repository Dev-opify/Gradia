async function loadGithubCalendar(username) {
  const container = document.getElementById("githubCalendar");
  try {
    const res = await fetch(`/github/${username}`);
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
    const svg = await res.text();
    container.innerHTML = svg; // only the contribution grid
  } catch (err) {
    console.error("GitHub calendar error:", err);
    container.innerHTML = `<p>Unable to load GitHub activity for ${username}</p>`;
  }
}

