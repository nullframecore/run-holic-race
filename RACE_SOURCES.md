# Race Sources

2026 러닝 대회 데이터는 자동 수집 + 수동 검증 방식으로 관리한다.

- 1차 수집: 엔듀로허브 연간 페이지
- 2차 검증: 중요 대회(메이저, 사용자 관심 대회)는 공식 페이지로 재확인
- 유지보수 원칙: 원천 사이트가 가진 누락/중복을 그대로 두지 않고, JSON 생성 단계에서 중복 제거

## Primary Source

- EnduroHub year page: <https://www.endurohub.kr/races/year/2026>
- Source shape includes monthly race arrays and metadata (`totalCount`)

## Build Command

- Online:
  - `node web/scripts/build_races_json.mjs`
- Offline (saved source HTML):
  - `node web/scripts/build_races_json.mjs --input /tmp/endurohub-2026.html`

## Scope

- `sport`가 `running`, `trail_running`인 항목만 포함한다.
- 동일 대회 중복은 `date + normalized title + region + sport` 키로 제거한다.
