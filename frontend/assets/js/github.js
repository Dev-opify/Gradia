// Lightweight placeholder GitHub calendar (randomized).
// You can replace with a real contribution fetch if desired.
function loadGithubCalendar(username) {
  const container = document.getElementById("githubCalendar");
  const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  let html = '<div style="display:grid;grid-template-columns:repeat(53,12px);gap:2px;">';
  for (let i=0;i<365;i++){
    const intensity = Math.floor(Math.random()*5);
    const color = colors[intensity];
    html += `<div style="width:10px;height:10px;background:${color};border-radius:2px;"></div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}
