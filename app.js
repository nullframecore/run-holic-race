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

function formatCompactDate(value) {
  const date = new Date(value + "T00:00:00");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
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

function locationSummary(race) {
  const region = (race.region || "").replace(/(특별시|광역시|특별자치도|특별자치시|도)$/u, "");
  const city = race.city && race.city !== race.region ? race.city : "";
  return [region, city].filter(Boolean).join(" · ") || race.region || "위치 미정";
}

function registrationStatus(race) {
  const note = race.registration_note || "";
  if (note.includes("추가")) return "추가 접수중";

  const today = new Date();
  const todayValue = new Date(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00`);
  const registrationStart = race.registration_start ? new Date(`${race.registration_start}T00:00:00`) : null;
  const registrationEnd = race.registration_end ? new Date(`${race.registration_end}T23:59:59`) : null;

  if (registrationStart && todayValue < registrationStart) return "접수 예정";
  if (registrationEnd && todayValue > registrationEnd) return "접수 완료";
  if (race.status === "접수마감") return "접수 완료";
  if (race.status === "접수중") return "접수중";
  if (race.status === "개최완료") return "대회 종료";
  return "접수 예정";
}

function statusClass(status) {
  switch (status) {
    case "접수중":
      return "status-open";
    case "추가 접수중":
      return "status-extended";
    case "접수 완료":
    case "대회 종료":
      return "status-closed";
    default:
      return "status-upcoming";
  }
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
    const raceStatus = registrationStatus(race);

    card.innerHTML = `
      <div class="card-topline">
        <span class="card-date">${formatCompactDate(race.date)}</span>
        <span class="card-distance">${distanceSummary(race)}</span>
      </div>
      <div class="card-main">
        <h3>${race.name}</h3>
        <div class="card-location">${locationSummary(race)}</div>
      </div>
      <div class="card-bottom">
        <span class="tag ${statusClass(raceStatus)}">${raceStatus}</span>
        ${race.url ? `<a href="${race.url}">공식 링크</a>` : ""}
      </div>
      <div class="card-sub">${registrationSummary(race)}</div>
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
