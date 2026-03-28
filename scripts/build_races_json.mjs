#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const SOURCE_URL = "https://www.endurohub.kr/races/year/2026";
const DEFAULT_OUTPUT = "web/races.json";

const REGION_MAP = {
  "서울": "서울특별시",
  "부산": "부산광역시",
  "대구": "대구광역시",
  "인천": "인천광역시",
  "광주": "광주광역시",
  "대전": "대전광역시",
  "울산": "울산광역시",
  "세종": "세종특별자치시",
  "경기": "경기도",
  "강원": "강원특별자치도",
  "충북": "충청북도",
  "충남": "충청남도",
  "전북": "전북특별자치도",
  "전남": "전라남도",
  "경북": "경상북도",
  "경남": "경상남도",
  "제주": "제주특별자치도"
};

const STATUS_MAP = {
  finished: "개최완료",
  registration_open: "접수중",
  registration_closed: "접수마감",
  upcoming: "예정"
};

function parseArgs(argv) {
  const options = { output: DEFAULT_OUTPUT, input: null };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input") {
      options.input = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (token === "--output") {
      options.output = argv[i + 1] || DEFAULT_OUTPUT;
      i += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      console.log("Usage: node web/scripts/build_races_json.mjs [--input /path/to/endurohub.html] [--output web/races.json]");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

async function loadHtml(inputPath) {
  if (inputPath) {
    return fs.readFileSync(inputPath, "utf8");
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch source: ${response.status}`);
  }
  return response.text();
}

function extractPayload(html) {
  const match = html.match(/\{type:"data",data:\{appName:[\s\S]*?\},uses:\{\}\},\{type:"data",data:(\{races:[\s\S]*?totalCount:\d+\}),uses:\{params:\["year"\]\}\}/);
  if (!match) {
    throw new Error("Failed to locate race payload in source HTML");
  }

  const payload = vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 2000 });
  if (!payload || !payload.races || !payload.year) {
    throw new Error("Invalid race payload shape");
  }
  return payload;
}

function normalizeTitle(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function normalizeRegion(region) {
  return REGION_MAP[region] || region || "미정";
}

function parseDistanceValues(values) {
  if (!Array.isArray(values)) return [];

  const parsed = [];
  for (const value of values) {
    if (typeof value !== "string") continue;

    const matches = value.matchAll(/(\d+(?:\.\d+)?)\s*(?:km|k)\b/gi);
    for (const match of matches) {
      const km = Number(match[1]);
      if (Number.isFinite(km) && km > 0) {
        parsed.push(km);
      }
    }
  }

  return Array.from(new Set(parsed)).sort((a, b) => b - a);
}

function normalizeRace(raw, indexDate) {
  const distances = parseDistanceValues(raw.distances);
  const officialUrl = typeof raw.officialUrl === "string" && raw.officialUrl.trim() ? raw.officialUrl.trim() : null;
  const detailPath = typeof raw.url === "string" ? raw.url : "";
  const detailUrl = detailPath ? `https://www.endurohub.kr${detailPath}` : SOURCE_URL;
  const region = normalizeRegion(raw.region);

  return {
    id: `KR-ENDUROHUB-2026-${String(raw.id).padStart(4, "0")}`,
    name: raw.title || "이름 미정",
    date: raw.raceDate,
    distance_km: distances[0] || 0,
    distances_km: distances,
    region,
    city: raw.region || null,
    country: "대한민국",
    organizer: raw.organizer || null,
    url: officialUrl || detailUrl,
    source: "엔듀로허브 2026 연간 캘린더",
    source_url: detailUrl,
    status: STATUS_MAP[raw.status] || raw.statusLabel || "예정",
    registration_start: raw.registrationStart || null,
    registration_end: raw.registrationEnd || null,
    registration_note: null,
    sport: raw.sport,
    sport_label: raw.sportLabel || null,
    updated_at: indexDate
  };
}

function buildRaces(payload, todayDate) {
  const allRows = Object.values(payload.races).flat();
  const runningRows = allRows.filter((race) => race.sport === "running" || race.sport === "trail_running");

  const deduped = new Map();
  for (const row of runningRows) {
    const key = [row.raceDate, normalizeTitle(row.title), row.region || "", row.sport || ""].join("|");
    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  }

  return Array.from(deduped.values())
    .map((row) => normalizeRace(row, todayDate))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.name.localeCompare(b.name, "ko");
    });
}

function toVersion(date) {
  return date.replace(/-/g, ".");
}

async function main() {
  const options = parseArgs(process.argv);
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;

  const html = await loadHtml(options.input);
  const payload = extractPayload(html);
  const races = buildRaces(payload, today);

  const output = {
    version: toVersion(today),
    updated_at: today,
    source: {
      provider: "엔듀로허브",
      page: SOURCE_URL,
      captured_year: payload.year,
      total_all_sports: payload.totalCount,
      total_running: races.length
    },
    races
  };

  fs.writeFileSync(options.output, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${races.length} races to ${options.output}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
