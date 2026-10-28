/*
 * RIIZE 샘플 소식 · 마감 임박 투표 예시.
 * 기사는 모두 실제 기사이며 2026-10-26 에 주소를 열어 제목·언론사·날짜를 확인했습니다.
 * 요약은 각 기사의 설명문(og:description)을 바탕으로 짧게 정리했습니다.
 */
import { addDays, todayKey } from "../date";
import { getDataStore } from "../storage";
import type { NewsInput } from "../storage/types";

type SampleNews = Omit<NewsInput, "artistIds">;

const NEWS: SampleNews[] = [
  {
    title: "라이즈, 이번엔 춤보다 목소리로 승부…신곡 'Insomnia' 공개",
    url: "https://www.tenasia.co.kr/article/2026102645674",
    source: "텐아시아",
    publishedAt: "2026-10-26",
    summary: "26일 0시 각종 음원 사이트를 통해 싱글 'Insomnia'를 발매하고 음악방송 활동에 나선다. 기타 선율 중심의 어쿠스틱 팝 곡이다.",
  },
  {
    title: "Watch: RIIZE Returns With MV For New Single \"Insomnia\"",
    url: "https://www.soompi.com/article/1879349wpp/watch-riize-drops-first-teasers-for-october-comeback-with-insomnia",
    source: "Soompi",
    publishedAt: "2026-10-26",
    summary: "디지털 싱글 'Insomnia' 발매 소식과 뮤직비디오를 전한 영문 기사. 여섯 멤버의 보컬을 앞세운 어쿠스틱 팝 곡이라고 소개했다.",
  },
  {
    title: "‘컴백’ 라이즈 “보컬이 가장 돋보이는 곡…멤버 간 호흡 열심히 맞췄죠” [일문일답]",
    url: "https://www.sportsworldi.com/newsView/20261025504078",
    source: "스포츠월드",
    publishedAt: "2026-10-25",
    summary: "신곡 공개를 앞두고 멤버들이 소속사 SM엔터테인먼트를 통해 작업 과정과 감상을 전한 일문일답.",
  },
  {
    title: "라이즈, 26일 신곡 '인섬니아' 발매…퍼포먼스 대신 감성 보컬 승부",
    url: "https://www.jnilbo.com/news/articleView.html?idxno=90000076445",
    source: "전남일보",
    publishedAt: "2026-10-25",
    summary: "26일 0시 새 싱글 '인섬니아'로 컴백한다고 소속사 SM엔터테인먼트가 밝혔다.",
  },
  {
    title: "라이즈, 26일 새 싱글 '인섬니아' 발매…\"보컬로 기억되는 곡 되길\"",
    url: "https://www.shinailbo.co.kr/news/articleView.html?idxno=5075599",
    source: "신아일보",
    publishedAt: "2026-10-25",
    summary: "새로운 분위기의 신곡 '인섬니아'로 26일 0시 돌아온다는 소속사 발표를 전했다.",
  },
  {
    title: "라이즈 26일 신곡 '인섬니아' 발매…첫 어쿠스틱 팝 도전",
    url: "https://news.jkn.co.kr/post/1047868",
    source: "재경일보",
    publishedAt: "2026-10-25",
    summary: "첫 어쿠스틱 팝 곡으로, 강렬한 퍼포먼스 대신 멤버들의 보컬과 화음으로 쓸쓸한 감정을 표현했다.",
  },
  {
    title: "라이즈 신곡 Insomnia 뮤직비디오, SF 소설가 천선란 참여한 드라마 형식",
    url: "https://www.pap-magazine.com/article/riize-insomnia-mv-coming-of-age-film",
    source: "PAP Magazine",
    publishedAt: "2026-10-24",
    summary: "SF 소설가 천선란과 일러스트레이터 노마가 멤버별 사이드 스토리를 만들고, 여섯 멤버가 각기 다른 캐릭터를 연기한 드라마 형식 뮤직비디오.",
  },
  {
    title: "라이즈, 26일 신곡 ‘인섬니아’ 발매...성수동서 팬 이벤트 개최",
    url: "https://isplus.com/article/view/isp202610200063",
    source: "일간스포츠",
    publishedAt: "2026-10-20",
    summary: "새 싱글 발매를 기념해 서울 성수동에서 팬 이벤트를 연다는 소식.",
  },
  {
    title: "라이즈, 26일 새 싱글 컴백…퍼포먼스 비우고 채운 '어쿠스틱 감성'",
    url: "https://www.nc.press/news/articleView.html?idxno=628920",
    source: "뉴스컬처",
    publishedAt: "2026-10-19",
    summary: "가을밤에 어울리는 어쿠스틱 감성의 신곡과 함께 4개월 만에 돌아온다는 컴백 발표 기사.",
  },
  {
    title: "RIIZE Announces October Comeback And 2027 Plans For New Full-Length Album",
    url: "https://www.soompi.com/article/1870026wpp/riize-announces-october-comeback-and-2027-plans-for-new-full-length-album",
    source: "Soompi",
    publishedAt: "2026-09-13",
    summary: "3주년 팬미팅에서 10월 컴백과 2027년 정규 앨범 계획을 발표했다는 영문 기사.",
  },
];

/** RIIZE 샘플 기사 추가. 같은 주소가 있으면 건너뜀. 추가한 개수를 돌려줌 */
export async function loadRiizeSampleNews(riizeId: string) {
  const { news } = getDataStore();
  const existing = new Set((await news.list()).map((n) => n.url));
  let added = 0;
  for (const item of NEWS) {
    if (existing.has(item.url)) continue;
    await news.create({ ...item, artistIds: [riizeId] });
    added += 1;
  }
  return added;
}

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
