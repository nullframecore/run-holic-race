const listEl = document.getElementById("raceList");
const emptyEl = document.getElementById("emptyState");
const regionFilter = document.getElementById("regionFilter");
const distanceFilter = document.getElementById("distanceFilter");
const updatedAtEl = document.getElementById("updatedAt");
const versionEl = document.getElementById("version");

let races = [];

function formatDate(value) {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function distanceLabel(km) {
  if (km === 0) return "기타";
  if (km >= 41) return "풀";
  if (km >= 20 && km < 30) return "하프";
  if (km === 10) return "10K";
  if (km === 5) return "5K";
  return `${km}K`;
}

function render() {
  listEl.innerHTML = "";
  const regionValue = regionFilter.value;
  const distanceValue = distanceFilter.value;

  const filtered = races.filter((race) => {
    const regionOk = regionValue === "all" || race.region === regionValue;
    let distanceOk = true;
    if (distanceValue === "other") {
      distanceOk = ![5, 10, 21, 42].includes(Math.round(race.distance_km));
    } else if (distanceValue !== "all") {
      distanceOk = Math.round(race.distance_km) === Number(distanceValue);
    }
    return regionOk && distanceOk;
  });

  if (!filtered.length) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  for (const race of filtered) {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <span class="tag">${race.status || ""}</span>
      <h3>${race.name}</h3>
      <div class="info">${formatDate(race.date)} · ${distanceLabel(Math.round(race.distance_km))} · ${race.region}</div>
      <div class="info">접수: ${race.registration_start || "-"} ~ ${race.registration_end || "-"}</div>
      <div class="info">주최: ${race.organizer || "-"}</div>
      ${race.url ? `<a href="${race.url}" target="_blank" rel="noreferrer">공식 링크</a>` : ""}
    `;

    listEl.appendChild(card);
  }
}

function populateRegions(items) {
  const regions = Array.from(new Set(items.map((r) => r.region))).sort();
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  }
}

async function load() {
  try {
    const res = await fetch("races.json", { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    const payload = await res.json();
    races = payload.races || [];
    updatedAtEl.textContent = `업데이트: ${payload.updated_at || "-"}`;
    versionEl.textContent = `버전: ${payload.version || "-"}`;
    populateRegions(races);
    render();
  } catch (err) {
    emptyEl.hidden = false;
  }
}

regionFilter.addEventListener("change", render);
distanceFilter.addEventListener("change", render);

load();
