
let state={content:null,role:"Todos",query:""};
const roleButtons=document.querySelectorAll("[data-role]");
const searchInput=document.querySelector("#search");
const roleFilter=document.querySelector("#roleFilter");
const mapGrid=document.querySelector("#mapGrid");
const agentCount=document.querySelector("#agentCount");
function byName(name){return state.content.agents.find(a=>a.displayName.toLowerCase()===name.toLowerCase())}
function agentCard(name){const a=byName(name);if(!a)return "";return `<div class="agent-mini"><img src="${a.displayIcon}" alt="${a.displayName}"><div><strong>${a.displayName}</strong><span>${a.role}</span></div></div>`}
function renderMaps(){
  const q=state.query.toLowerCase(),role=state.role;
  const pool=state.content.mapPool || Object.keys(state.content.manualPicks || {});
  const mapsByName=new Map(state.content.maps.map(m=>[m.displayName,m]));

  mapGrid.innerHTML=pool.map(mapName=>{
    const map=mapsByName.get(mapName);
    if(!map)return "";
    const picks=(state.content.manualPicks[map.displayName]||[])
      .map(name=>byName(name))
      .filter(Boolean)
      .filter(agent=>role==="Todos"||agent.role===role)
      .filter(agent=>!q||`${agent.displayName} ${agent.role} ${map.displayName}`.toLowerCase().includes(q))
      .slice(0,5);

    if(!picks.length)return "";
    return `<article class="card"><img class="map-img" src="${map.splash}" alt="${map.displayName}"><div class="body"><div class="title"><h3>${map.displayName}</h3><span class="chip">${picks.length} picks</span></div><div class="agents">${picks.map(a=>agentCard(a.displayName)).join("")}</div></div></article>`
  }).join("")
}
async function init(){const res=await fetch(apiUrl("/api/content"));state.content=await res.json();agentCount.textContent=state.content.agents.length;renderMaps()}
searchInput?.addEventListener("input",e=>{state.query=e.target.value;renderMaps()});
roleFilter?.addEventListener("change",e=>{state.role=e.target.value;roleButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.role===state.role));renderMaps()});
roleButtons.forEach(btn=>btn.addEventListener("click",()=>{state.role=btn.dataset.role;if(roleFilter)roleFilter.value=state.role;roleButtons.forEach(b=>b.classList.toggle("active",b===btn));renderMaps()}));
init();
