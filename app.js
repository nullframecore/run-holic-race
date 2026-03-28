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

function formatKm(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

function distanceLabel(km) {
  if (km === 0) return "기타";
  if (Math.abs(km - 42.195) < 1) return "풀";
  if (Math.abs(km - 21.0975) < 1) return "하프";
  if (Math.abs(km - 10) < 0.5) return "10K";
  if (Math.abs(km - 5) < 0.5) return "5K";
  return `${formatKm(km)}K`;
}

function normalizeDistances(race) {
  const candidates = Array.isArray(race.distances_km) && race.distances_km.length
    ? race.distances_km
    : [race.distance_km];

  return Array.from(
    new Set(
      candidates
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  ).sort((left, right) => right - left);
}

function distanceSummary(race) {
  const distances = normalizeDistances(race);
  if (!distances.length) return "거리 미정";
  return distances.map((km) => distanceLabel(km)).join(" / ");
}

function registrationSummary(race) {
  if (race.registration_note) return race.registration_note;
  if (race.registration_start || race.registration_end) {
    return `${race.registration_start || "-"} ~ ${race.registration_end || "-"}`;
  }
  return "추후 공지";
}

function render() {
  listEl.innerHTML = "";
  const regionValue = regionFilter.value;
  const distanceValue = distanceFilter.value;

  const filtered = races.filter((race) => {
    const regionOk = regionValue === "all" || race.region === regionValue;
    const distances = normalizeDistances(race);
    let distanceOk = true;
    if (distanceValue === "other") {
      distanceOk = distances.some((km) => ![5, 10, 21, 42].includes(Math.round(km)));
    } else if (distanceValue !== "all") {
      distanceOk = distances.some((km) => Math.round(km) === Number(distanceValue));
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
      <div class="info">${formatDate(race.date)} · ${distanceSummary(race)} · ${race.region}</div>
      <div class="info">종목: ${race.sport_label || "러닝"}</div>
      <div class="info">접수: ${registrationSummary(race)}</div>
      <div class="info">주최: ${race.organizer || "-"}</div>
      ${race.url ? `<a href="${race.url}" target="_blank" rel="noreferrer">공식 페이지</a>` : ""}
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
