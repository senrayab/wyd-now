/*
 * 마감 임박 투표 예시 (샘플 기사는 기사 모음을 없애면서 뺐습니다)
 */
import { addDays, todayKey } from "../date";
import { getDataStore } from "../storage";

const URGENT_NAME = "[샘플] 엠카운트다운 사전 투표";

/** 마감 임박(내일 마감) 표시를 보여주는 투표 예시 — 링크는 실제 사이트 */
export async function loadUrgentVoteSample(riizeId: string) {
  const { votes } = getDataStore();
  if ((await votes.list()).some((v) => v.name === URGENT_NAME)) return false;
  const today = todayKey();
  await votes.create({
    name: URGENT_NAME,
    site: "Mnet Plus",
    url: "https://www.mnetplus.world/",
    type: "musicshow",
    description: "※ 마감 임박 표시를 확인하기 위한 샘플이에요. 실제 투표 일정이 아니에요.",
    artistIds: [riizeId],
    startDate: today,
    endDate: addDays(today, 1),
  });
  return true;
}
