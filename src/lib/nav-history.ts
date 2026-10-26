/** 앱 안에서 이동한 횟수. 0 이면 공유 링크 등으로 바로 들어온 것 → 뒤로 가기 대신 기본 경로로 */
let visits = 0;

export function recordVisit() {
  visits += 1;
}

export function hasInAppHistory() {
  return visits > 1;
}
