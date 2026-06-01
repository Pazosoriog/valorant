const avatars = [
  "/avatars/dog1.jpg",
  "/avatars/dog2.jpg",
  "/avatars/dog3.jpg",
  "/avatars/dog4.jpg",
  "/avatars/dog5.jpg",
  "/avatars/dog6.jpg",
  "/avatars/dog7.jpg",
];

function getRandomAvatar() {
  return avatars[Math.floor(Math.random() * avatars.length)];
}

const form = document.querySelector("#pickForm");
const results = document.querySelector("#results");
const statusBox = document.querySelector("#status");

async function checkHealth() {
  const res = await fetch("/api/health");
  const data = await res.json();
  statusBox.innerHTML = `<strong>API</strong><span class="chip">Modo: ${data.mode}</span>`;
}

function rowClass(result) {
  return result === "Victoria" ? "result-win" : "result-loss";
}

function renderProfile(json) {
  const t = json.tracker || {};
  const p = t.player || json.player || {};
  const agents = t.agents || [];
  const maps = t.maps || [];
  const matches = t.matches || [];
  const avatar = getRandomAvatar();

  return `
  <div class="tracker-profile">
    <article class="profile-hero">
      <div class="profile-avatar">
        <img src="${avatar}" alt="avatar">
      </div>

      <div class="profile-name">
        <small>Perfil competitivo</small>
        <h2>${p.riotId || "Jugador"}</h2>

        <div class="profile-tags">
          <span class="chip">Fuente: ${json.source}</span>
          <span class="chip">Región: ${json.region || "latam"}</span>
          <span class="chip">Partidas: ${json.matchesAnalyzed ?? p.games ?? 0}</span>
          <span class="chip">Main: ${p.mainAgent?.agent || "Sin datos"}</span>
        </div>
      </div>

      <div class="profile-actions">
        <span class="chip">Rango: ${p.rank || "No disponible"}</span>
        ${p.rr !== null && p.rr !== undefined ? `<span class="chip">RR: ${p.rr}</span>` : ""}
        ${p.elo !== null && p.elo !== undefined ? `<span class="chip">ELO: ${p.elo}</span>` : ""}
        <span class="chip">Actualizado ahora</span>
      </div>
    </article>

    <section class="stat-grid">
      <div class="stat-card"><small>Rango</small><strong>${p.rank || "No disponible"}</strong></div>
      <div class="stat-card"><small>Winrate</small><strong>${p.winrate ?? 0}%</strong></div>
      <div class="stat-card"><small>KDA</small><strong>${p.kda ?? "0.00"}</strong></div>
      <div class="stat-card"><small>Score promedio</small><strong>${p.avgScore ?? 0}</strong></div>
      <div class="stat-card"><small>HS%</small><strong>${p.hsPercent ?? 0}%</strong></div>
      <div class="stat-card"><small>Kills</small><strong>${p.kills ?? 0}</strong></div>
      <div class="stat-card"><small>Deaths</small><strong>${p.deaths ?? 0}</strong></div>
      <div class="stat-card"><small>Victorias</small><strong>${p.wins ?? 0}</strong></div>
    </section>

    <div class="tracker-tabs">
      <button class="tracker-tab active">Overview</button>
      <button class="tracker-tab">Matches</button>
      <button class="tracker-tab">Agents</button>
      <button class="tracker-tab">Maps</button>
    </div>

    <section class="tracker-section">
      <h3>Últimas partidas</h3>
      <table class="tracker-table">
        <thead>
          <tr>
            <th>Resultado</th>
            <th>Mapa</th>
            <th>Agente</th>
            <th>K/D/A</th>
            <th>KDA</th>
            <th>HS%</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${
            matches.map(m => `
              <tr>
                <td class="${rowClass(m.result)}">${m.result}</td>
                <td>${m.map}</td>
                <td>${m.agent}</td>
                <td>${m.kills}/${m.deaths}/${m.assists}</td>
                <td>${m.kda}</td>
                <td>${m.hsPercent}%</td>
                <td>${m.score}</td>
              </tr>
            `).join("") || `<tr><td colspan="7">Sin partidas disponibles.</td></tr>`
          }
        </tbody>
      </table>
    </section>

    <section class="tracker-section">
      <h3>Rendimiento por agente</h3>
      <table class="tracker-table">
        <thead>
          <tr>
            <th>Agente</th>
            <th>Partidas</th>
            <th>Winrate</th>
            <th>K/D/A total</th>
            <th>KDA</th>
          </tr>
        </thead>
        <tbody>
          ${
            agents.map(a => `
              <tr>
                <td>${a.agent}</td>
                <td>${a.games}</td>
                <td>${a.winrate}%</td>
                <td>${a.kills}/${a.deaths}/${a.assists}</td>
                <td>${a.kda}</td>
              </tr>
            `).join("") || `<tr><td colspan="5">Sin agentes disponibles.</td></tr>`
          }
        </tbody>
      </table>
    </section>

    <section class="tracker-section">
      <h3>Rendimiento por mapa</h3>
      <table class="tracker-table">
        <thead>
          <tr>
            <th>Mapa</th>
            <th>Partidas</th>
            <th>Winrate</th>
            <th>KDA</th>
          </tr>
        </thead>
        <tbody>
          ${
            maps.map(m => `
              <tr>
                <td>${m.map}</td>
                <td>${m.games}</td>
                <td>${m.winrate}%</td>
                <td>${m.kda}</td>
              </tr>
            `).join("") || `<tr><td colspan="4">Sin mapas disponibles.</td></tr>`
          }
        </tbody>
      </table>
    </section>
  </div>
  `;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const region = document.querySelector("#region").value.trim();
  const name = document.querySelector("#name").value.trim();
  const tag = document.querySelector("#tag").value.trim();

  results.innerHTML = `<p class="subtitle">Buscando perfil competitivo y rango...</p>`;

  const res = await fetch(`/api/pickrates/${encodeURIComponent(region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=10`);
  const json = await res.json();

  if (!res.ok) {
    results.innerHTML = `<pre class="pick-card">${JSON.stringify(json, null, 2)}</pre>`;
    return;
  }

  results.innerHTML = renderProfile(json);
});

checkHealth();
