
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const HENRIK_API_KEY = process.env.HENRIK_API_KEY || "";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const VALORANT_API = "https://valorant-api.com/v1";
const HENRIK_API = "https://api.henrikdev.xyz/valorant/v3";

const manualPicks = {
  Ascent: ["Sova", "Omen", "Jett", "Killjoy", "KAY/O","Cypher","Brimstone"],
  Breeze: ["Viper", "Sova","Omen", "Jett", "KAY/O", "Waylay", "Neon", "Cypher", "Harbor"],
  Fracture: ["Raze", "Breach", "Brimstone", "Killjoy", "Neon", "Tejo", "Omen","cypher"],
  Haven: ["Omen", "Sova", "Cypher", "Breach", "Jett", "Astra", "Iso", "Killjoy", "Waylay"],
  Lotus: ["Raze", "Fade", "Omen", "Vyse", "Breach", "Astra", "Brimstone", "Cypher"],
  Pearl: ["Sova", "Gekko", "Killjoy", "Omen", "jett", "Chamber", "Waylay", "Vyse"],
  Split: ["Chamber", "Omen", "Cypher", "Skye", "Astra","Breach", "Jett", "Harbor", "Raze"]
};

const tiers = {
  "S Tier": ["Omen", "Sova", "Cypher", "Killjoy", "Raze", "Jett"],
  "A Tier": [ "Viper", "Fade", "Breach", "Skye", "Gekko", "Astra", "Chamber", "Tejo", "Miks", "Vyse"],
  "B Tier": ["Clove", "Neon", "KAY/O", "Brimstone", "Sage", "Harbor", "Phoenix", "Iso", "Waylay", "Deadlock", "Veto"],
  "C Tier": ["Reyna", "Yoru"]
};

let cache = { content: null, at: 0 };

async function getContent() {
  if (cache.content && Date.now() - cache.at < 1000 * 60 * 60) return cache.content;

  const [agentsRes, mapsRes] = await Promise.all([
    fetch(`${VALORANT_API}/agents?isPlayableCharacter=true&language=es-ES`),
    fetch(`${VALORANT_API}/maps?language=es-ES`),
  ]);

  if (!agentsRes.ok || !mapsRes.ok) throw new Error("No se pudo conectar con Valorant-API");

  const agentsJson = await agentsRes.json();
  const mapsJson = await mapsRes.json();

  const agents = agentsJson.data
    .filter(a => a.displayName && a.displayIcon)
    .map(a => ({
      displayName: a.displayName,
      role: a.role?.displayName || "Sin rol",
      displayIcon: a.displayIcon,
      fullPortrait: a.fullPortrait || a.displayIcon,
    }));

  agents.push(
    { displayName: "Veto", role: "Centinela", displayIcon: "/veto.gif", fullPortrait: "/veto.gif" },
    { displayName: "Miks", role: "Controlador", displayIcon: "/miks.jpg", fullPortrait: "/miks.jpg" }
  );

  const maps = mapsJson.data
    .filter(m => m.displayName && m.splash)
    .map(m => ({ displayName: m.displayName, splash: m.splash }));

  cache = { content: { agents, maps, manualPicks, tiers, patch: "Patch 12.10 / V26 Act 3", mapPool: ["Ascent","Breeze","Fracture","Haven","Lotus","Pearl","Split"], updatedAt: new Date().toISOString() }, at: Date.now() };
  return cache.content;
}

function demoPickrates() {
  return Object.entries(manualPicks).map(([map, names]) => ({
    map,
    picks: names.map((agent, i) => ({
      agent,
      count: 50 - i * 7,
      pickRate: Number((42 - i * 5.4).toFixed(1)),
    })),
  }));
}

function calculatePickRates(matches) {
  const stats = {};
  for (const match of matches) {
    const map = match?.metadata?.map || match?.metadata?.map_name || "Desconocido";
    const players = match?.players?.all_players || match?.players || [];
    if (!Array.isArray(players)) continue;
    if (!stats[map]) stats[map] = { total: 0, agents: {} };

    for (const player of players) {
      const agent = player?.character || player?.agent?.name || player?.agent;
      if (!agent || !validRealAgent(agent)) continue;
      stats[map].total++;
      stats[map].agents[agent] = (stats[map].agents[agent] || 0) + 1;
    }
  }

  return Object.entries(stats).map(([map, data]) => ({
    map,
    picks: Object.entries(data.agents)
      .map(([agent, count]) => ({ agent, count, pickRate: Number(((count / data.total) * 100).toFixed(1)) }))
      .sort((a, b) => b.pickRate - a.pickRate),
  }));
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mode: HENRIK_API_KEY ? "henrik-api-ready" : "demo-no-api-key" });
});

app.get("/api/content", async (req, res) => {
  try { res.json(await getContent()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});


function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculatePlayerSummary(matches, name, tag) {
  let kills = 0, deaths = 0, assists = 0, wins = 0, games = 0;
  const agentCounts = {};
  const mapWins = {};
  const targetName = String(name || "").toLowerCase();
  const targetTag = String(tag || "").toLowerCase();

  for (const match of matches) {
    const players = match?.players?.all_players || match?.players || [];
    if (!Array.isArray(players)) continue;

    const player = players.find(p => {
      const pName = String(p?.name || "").toLowerCase();
      const pTag = String(p?.tag || "").toLowerCase();
      return pName === targetName && (!targetTag || pTag === targetTag);
    });

    if (!player) continue;
    games += 1;
    const stats = player.stats || {};
    kills += normalizeNumber(stats.kills ?? player.kills);
    deaths += normalizeNumber(stats.deaths ?? player.deaths);
    assists += normalizeNumber(stats.assists ?? player.assists);
    const agent = player.character || player.agent?.name || player.agent || "Desconocido";
    agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    const map = match?.metadata?.map || match?.metadata?.map_name || "Desconocido";
    if (!mapWins[map]) mapWins[map] = { wins: 0, total: 0 };
    mapWins[map].total += 1;
    const playerTeam = String(player.team || "").toLowerCase();
    const winningTeam = String(match?.teams?.red?.has_won ? "red" : match?.teams?.blue?.has_won ? "blue" : "").toLowerCase();
    if (playerTeam && winningTeam && playerTeam === winningTeam) {
      wins += 1;
      mapWins[map].wins += 1;
    }
  }
  const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);
  const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const mainAgent = Object.entries(agentCounts).sort((a,b)=>b[1]-a[1]).map(([agent,count])=>({agent,count}))[0] || { agent: "Sin datos", count: 0 };
  const topMaps = Object.entries(mapWins).map(([map,value])=>({map,games:value.total,winrate:value.total ? Math.round((value.wins/value.total)*100) : 0})).sort((a,b)=>b.winrate-a.winrate).slice(0,3);
  return { riotId: `${name}#${tag}`, rank: "No disponible", games, wins, winrate, kills, deaths, assists, kda, mainAgent, topMaps };
}

function demoPlayerSummary(name, tag) {
  return { riotId: `${name}#${tag}`, rank: "Ascendant 3", games: 7, wins: 4, winrate: 57, kills: 132, deaths: 109, assists: 48, kda: "1.65", mainAgent: { agent: "Jett", count: 3 }, topMaps: [{ map: "Ascent", games: 2, winrate: 100 },{ map: "Breeze", games: 2, winrate: 50 },{ map: "Split", games: 1, winrate: 100 }] };
}



const CUSTOM_AGENT_NAMES = new Set(["veto", "miks"]);

function validRealAgent(agent) {
  return agent && !CUSTOM_AGENT_NAMES.has(String(agent).toLowerCase());
}

function buildTrackerProfile(matches, name, tag) {
  const player = calculatePlayerSummary(matches, name, tag);
  const agents = {};
  const maps = {};
  const recentMatches = [];

  const targetName = String(name || "").toLowerCase();
  const targetTag = String(tag || "").toLowerCase();

  for (const match of matches) {
    const players = match?.players?.all_players || match?.players || [];
    if (!Array.isArray(players)) continue;

    const me = players.find(p => {
      const pName = String(p?.name || "").toLowerCase();
      const pTag = String(p?.tag || "").toLowerCase();
      return pName === targetName && (!targetTag || pTag === targetTag);
    });
    if (!me) continue;

    const map = match?.metadata?.map || match?.metadata?.map_name || "Desconocido";
    const stats = me.stats || {};
    const agent = me.character || me.agent?.name || me.agent || "Desconocido";
    const kills = normalizeNumber(stats.kills ?? me.kills);
    const deaths = normalizeNumber(stats.deaths ?? me.deaths);
    const assists = normalizeNumber(stats.assists ?? me.assists);
    const score = normalizeNumber(stats.score ?? me.score);
    const hs = normalizeNumber(stats.headshots ?? me.headshots);
    const body = normalizeNumber(stats.bodyshots ?? me.bodyshots);
    const leg = normalizeNumber(stats.legshots ?? me.legshots);
    const shots = hs + body + leg;
    const hsPercent = shots ? Math.round((hs / shots) * 100) : 0;

    const playerTeam = String(me.team || "").toLowerCase();
    const winningTeam = String(match?.teams?.red?.has_won ? "red" : match?.teams?.blue?.has_won ? "blue" : "").toLowerCase();
    const won = Boolean(playerTeam && winningTeam && playerTeam === winningTeam);

    if (!agents[agent]) agents[agent] = { agent, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    agents[agent].games += 1;
    agents[agent].wins += won ? 1 : 0;
    agents[agent].kills += kills;
    agents[agent].deaths += deaths;
    agents[agent].assists += assists;

    if (!maps[map]) maps[map] = { map, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    maps[map].games += 1;
    maps[map].wins += won ? 1 : 0;
    maps[map].kills += kills;
    maps[map].deaths += deaths;
    maps[map].assists += assists;

    recentMatches.push({
      map,
      agent,
      result: won ? "Victoria" : "Derrota",
      kills,
      deaths,
      assists,
      score,
      hsPercent,
      kda: deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2),
    });
  }

  const agentStats = Object.values(agents).map(a => ({
    ...a,
    winrate: a.games ? Math.round((a.wins / a.games) * 100) : 0,
    kda: a.deaths ? ((a.kills + a.assists) / a.deaths).toFixed(2) : (a.kills + a.assists).toFixed(2)
  })).sort((a,b)=>b.games-a.games);

  const mapStats = Object.values(maps).map(m => ({
    ...m,
    winrate: m.games ? Math.round((m.wins / m.games) * 100) : 0,
    kda: m.deaths ? ((m.kills + m.assists) / m.deaths).toFixed(2) : (m.kills + m.assists).toFixed(2)
  })).sort((a,b)=>b.games-a.games);

  const avgScore = recentMatches.length ? Math.round(recentMatches.reduce((s,m)=>s+m.score,0)/recentMatches.length) : 0;
  const avgHs = recentMatches.length ? Math.round(recentMatches.reduce((s,m)=>s+m.hsPercent,0)/recentMatches.length) : 0;

  return {
    player: {
      ...player,
      rank: player.rank || "No disponible",
      avgScore,
      hsPercent: avgHs
    },
    agents: agentStats,
    maps: mapStats,
    matches: recentMatches.slice(0, 10)
  };
}

function filterCustomPickRates(data) {
  return data.map(map => ({
    ...map,
    picks: map.picks.filter(p => validRealAgent(p.agent))
  }));
}



async function fetchRankInfo(region, name, tag) {
  if (!HENRIK_API_KEY) return null;

  const url = `${HENRIK_API}/mmr/${encodeURIComponent(region)}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

  try {
    const apiRes = await fetch(url, {
      headers: { Authorization: HENRIK_API_KEY }
    });

    const json = await apiRes.json();

    if (!apiRes.ok) {
      console.warn("No se pudo obtener MMR:", json);
      return null;
    }

    const data = json.data || {};
    const current = data.current || data.current_data || data;

    const tier =
      current?.tier?.name ||
      current?.tier?.patched ||
      current?.tier?.displayName ||
      current?.currenttierpatched ||
      current?.rank ||
      data?.currenttierpatched ||
      null;

    const rr =
      current?.rr ??
      current?.ranking_in_tier ??
      current?.elo_change_to_last_game ??
      data?.ranking_in_tier ??
      null;

    const elo =
      current?.elo ??
      data?.elo ??
      null;

    const leaderboard =
      current?.leaderboard_placement ??
      data?.leaderboard_placement ??
      null;

    if (!tier && rr === null && elo === null) return null;

    return {
      tier: tier || "No disponible",
      rr,
      elo,
      leaderboard,
      display: `${tier || "No disponible"}${rr !== null && rr !== undefined ? ` - ${rr} RR` : ""}`
    };
  } catch (error) {
    console.warn("Error consultando MMR:", error.message);
    return null;
  }
}

function applyRankToTracker(tracker, rankInfo) {
  if (!tracker || !tracker.player) return tracker;
  if (rankInfo) {
    tracker.player.rank = rankInfo.display;
    tracker.player.rankTier = rankInfo.tier;
    tracker.player.rr = rankInfo.rr;
    tracker.player.elo = rankInfo.elo;
    tracker.player.leaderboard = rankInfo.leaderboard;
  }
  return tracker;
}


app.get("/api/pickrates/:region/:name/:tag", async (req, res) => {
  try {
    const { region, name, tag } = req.params;
    const size = Math.min(Number(req.query.size || 10), 10);

    if (!HENRIK_API_KEY) {
      return res.json({ source: "demo", warning: "No hay HENRIK_API_KEY. Se usan datos demo.", player: demoPlayerSummary(name, tag), tracker: buildTrackerProfile([], name, tag), data: demoPickrates() });
    }

    const url = `${HENRIK_API}/matches/${encodeURIComponent(region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=competitive&size=${size}`;
    const apiRes = await fetch(url, { headers: { Authorization: HENRIK_API_KEY } });
    const json = await apiRes.json();

    if (!apiRes.ok) return res.status(apiRes.status).json({ source: "henrikdev", error: json });

    const matches = Array.isArray(json.data) ? json.data : [];
    const tracker = buildTrackerProfile(matches, name, tag);
    const rankInfo = await fetchRankInfo(region, name, tag);
    applyRankToTracker(tracker, rankInfo);

    res.json({
      source: "henrikdev",
      player: tracker.player,
      region,
      matchesAnalyzed: matches.length,
      tracker,
      data: filterCustomPickRates(calculatePickRates(matches))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Servidor listo en http://localhost:${PORT}`));
