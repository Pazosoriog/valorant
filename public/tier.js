async function initTier(){
  const res=await fetch(apiUrl("/api/content"));
  const content=await res.json();
  const grid=document.querySelector("#tierGrid");

  function byName(name){
    return content.agents.find(a=>a.displayName.toLowerCase()===name.toLowerCase())
  }

  grid.innerHTML=`
    <article class="card" style="grid-column:1/-1">
      <div class="body">
        <div class="title">
          <h3>${content.patch || "Patch actual"}</h3>
          <span class="chip">${(content.mapPool || []).join(" · ")}</span>
        </div>
        <p class="subtitle">Ranking orientativo para ranked/competitivo. Ajusta según composición y comodidad, porque por desgracia todavía no existe botón para ganar solo.</p>
      </div>
    </article>
  ` + Object.entries(content.tiers).map(([tier,names])=>`
    <article class="card">
      <div class="body">
        <div class="title">
          <h3>${tier}</h3>
          <span class="chip">${names.length} agentes</span>
        </div>
        <div class="agents">
          ${names.map(name=>{
            const a=byName(name);
            if(!a)return "";
            return `<div class="agent-mini"><img src="${a.displayIcon}" alt="${a.displayName}"><div><strong>${a.displayName}</strong><span>${a.role}</span></div></div>`
          }).join("")}
        </div>
      </div>
    </article>
  `).join("");
}
initTier();
