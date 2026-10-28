"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { CheckCircle2, ExternalLink, Plus, Share, SquarePlus, WifiOff } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import Illustration from "@/components/Illustration";
import { promptInstall, useInstallState } from "@/lib/install";
import styles from "./Guide.module.css";

function useOfflineReady() {
  return useSyncExternalStore(
    (cb) => {
      navigator.serviceWorker?.addEventListener("controllerchange", cb);
      return () => navigator.serviceWorker?.removeEventListener("controllerchange", cb);
    },
    () => !!navigator.serviceWorker?.controller,
    () => false,
  );
}

export function InstallScreen() {
  const state = useInstallState();
  const offlineReady = useOfflineReady();
  const { toast } = useFeedback();

  return (
    <main>
      <PageHeader back="/more/support" title="앱 설치 · 오프라인" />

      <section className={`card ${styles.preview}`}>
        <Illustration category="content" className={styles.previewIllo} />
        <p className={`${styles.previewBig} num`}>wyd now</p>
        {/* 오른쪽 위 일러스트와 겹치지 않게 본문을 일러스트 아래로 */}
        <p className={styles.previewBody} style={{ marginTop: 42 }}>
          홈 화면에 설치하면 앱처럼 전체 화면으로 열리고,
          <br />
          인터넷 연결 없이도 저장된 일정과 이미지를 볼 수 있어요.
        </p>
        <div style={{ marginTop: 18 }}>
          {state === "installed" ? (
            <span className="tag" style={{ height: 34, padding: "0 14px", fontSize: 13 }}>
              <CheckCircle2 size={15} /> 이미 설치되어 있어요
            </span>
          ) : state === "available" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                const result = await promptInstall();
                if (result === "accepted") toast("설치를 시작했어요.");
              }}
            >
              <SquarePlus size={17} /> 홈 화면에 설치
            </button>
          ) : (
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              이 브라우저에서는 설치 버튼을 바로 띄울 수 없어요. 아래 방법으로 직접 추가해 주세요.
            </p>
          )}
        </div>
      </section>

      <h2 className={styles.groupTitle}>직접 추가하는 방법</h2>
      <div className="list">
        <div className="list-row">
          <span className="list-icon">
            <Share size={17} />
          </span>
          <span className="label">
            <strong>iPhone · iPad (Safari)</strong>
            <small>공유 버튼 → ‘홈 화면에 추가’</small>
          </span>
        </div>
        <div className="list-row">
          <span className="list-icon">
            <Plus size={17} />
          </span>
          <span className="label">
            <strong>Android (Chrome · 삼성 인터넷)</strong>
            <small>메뉴(⋮) → ‘앱 설치’ 또는 ‘홈 화면에 추가’</small>
          </span>
        </div>
        <div className="list-row">
          <span className="list-icon">
            <SquarePlus size={17} />
          </span>
          <span className="label">
            <strong>PC (Chrome · Edge)</strong>
            <small>주소창 오른쪽의 설치 아이콘 클릭</small>
          </span>
        </div>
      </div>

      <h2 className={styles.groupTitle}>오프라인 사용</h2>
      <div className="card-flat">
        <div className="row" style={{ marginBottom: 8 }}>
          <WifiOff size={17} />
          <strong style={{ fontSize: 15 }}>{offlineReady ? "오프라인 준비 완료" : "오프라인 준비 중"}</strong>
        </div>
        <p className="prose">
          {offlineReady
            ? "앱 화면이 이 기기에 저장되어 있어요. 인터넷이 끊겨도 일정·투표 조회와 등록·수정·삭제, 저장된 이미지 보기를 할 수 있어요."
            : "처음 방문했을 때는 화면 파일을 내려받는 중이에요. 인터넷이 연결된 상태에서 한 번 새로고침하면 준비돼요."}
        </p>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>
          뉴스, 지도·공식 링크·투표 사이트처럼 인터넷에서 가져오거나 외부로 이동하는 기능은 인터넷이 필요해요.
        </p>
      </div>
    </main>
  );
}

const FAQ = [
  {
    q: "어떤 앱인가요?",
    a: "아티스트의 공연·방송·라디오·예능·팬사인·콘텐츠·발매 일정과 투표, 뉴스를 모아 보는 정보 앱이에요. 개인 메모가 아닌, 모두에게 필요한 공식 정보를 다뤄요.",
  },
  {
    q: "일정은 어떻게 등록하나요?",
    a: "하단 메뉴 가운데의 + 버튼을 누르고 ‘일정 등록’을 고르거나, 캘린더에서 날짜를 고른 뒤 ‘이 날 일정 등록’을 누르세요. 투표도 같은 + 버튼의 ‘투표 등록’에서 등록해요.",
  },
  {
    q: "정보는 어디에 저장되나요?",
    a: "이 기기의 브라우저 저장소에 저장돼요. 다른 기기로 옮기려면 더보기 → 데이터 → 백업 · 복원을 이용하세요. 서버 동기화는 추후 지원할 예정이에요.",
  },
  {
    q: "이미지를 올리면 화질이 바뀌나요?",
    a: "용량을 줄이기 위해 WebP 형식으로 변환해 보관해요. 긴 변이 2560px보다 크면 비율을 유지한 채 줄여요.",
  },
  {
    q: "투명 배경 이미지도 그대로 유지되나요?",
    a: "네. WebP로 보관해도 투명한 부분은 그대로 유지돼요. 단, JPG처럼 처음부터 투명도가 없는 이미지는 투명해지지 않아요.",
  },
  {
    q: "투표 메뉴는 무엇인가요?",
    a: "음악방송·시상식·투표 앱의 투표 일정을 모아 두는 곳이에요. 진행 중 · 예정 · 지난 투표로 나뉘고, 바로가기를 누르면 해당 사이트로 이동해요. 수정·복사·삭제는 카드의 ⋯ 메뉴에서 해요. 북마크한 투표는 ‘내 공간’에 모이고, 거기서 오늘 투표했는지 체크할 수 있어요.",
  },
  {
    q: "뉴스는 어디서 보나요?",
    a: "홈의 ‘최근 소식’에서 ‘전체’를 누르면 최근 7일 기사를 자동으로 모아 보여 줘요. 기사 옆 북마크를 누르면 ‘내 공간’에 스크랩되고, 스크랩은 이 기기에만 저장돼요. 스크랩을 해제하면 저장해 둔 기사도 함께 지워져요.",
  },
  {
    q: "‘내 공간’은 무엇인가요?",
    a: "나만 보는 개인 기록을 모아 두는 곳이에요(더보기 → 내 공간). 북마크한 투표(오늘 투표 체크), 스크랩한 기사가 모이고, 최애 멤버는 내 아티스트 전용 모드면 여기서, 아니면 아티스트 페이지의 MY 칸에서 골라요. 모두 이 기기에만 저장되고 공개 정보와는 분리돼요.",
  },
  {
    q: "알림을 받을 수 있나요?",
    a: "일정 상세의 ‘내 캘린더에 추가’를 누르면 .ics 파일로 내 캘린더 앱에 넣을 수 있어요. 알림은 캘린더 앱에서 설정해 주세요.",
  },
];

/** 한 번에 하나만 열리는 아코디언: 높이는 grid-template-rows 0fr↔1fr 로 부드럽게 */
export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <main>
      <PageHeader back="/more/support" title="도움말" />
      <div className={`list ${styles.faq}`}>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className={styles.faqItem} data-open={isOpen}>
              <button
                type="button"
                className={styles.faqQ}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {item.q}
                <Plus size={18} className={styles.faqIcon} aria-hidden />
              </button>
              <div id={`${baseId}-${i}`} className={styles.faqA} role="region" aria-hidden={!isOpen}>
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/more/support/install" className="btn btn-soft btn-block" style={{ marginTop: 16 }}>
        앱 설치 · 오프라인 안내 보기
      </Link>
    </main>
  );
}

export function PrivacyScreen() {
  return (
    <main>
      <PageHeader back="/more/support" title="개인정보 안내" />
      <article className="card prose">
        <h3 style={{ marginTop: 0 }}>수집하는 정보</h3>
        <p>wyd now 는 회원가입이나 로그인이 없고, 이름·연락처 같은 개인정보를 수집하지 않아요.</p>
        <h3>저장 위치</h3>
        <p>등록한 아티스트, 일정, 투표, 이미지와 내 공간(팔로우·최애)·스크랩한 기사는 모두 이 기기의 브라우저 저장소(IndexedDB)에만 저장되며 서버로 전송되지 않아요. 투표 북마크, 오늘 투표 완료 체크(날짜가 바뀌면 지워짐), 화면 설정, 최근 받은 뉴스 목록은 브라우저 localStorage 에 저장돼요.</p>
        <h3>외부 서비스</h3>
        <p>뉴스는 wyd now 서버가 네이버 뉴스 검색·빙 뉴스에서 기사 제목·출처·링크를 받아 전달해요. 이때 내 정보는 함께 보내지 않아요. 글꼴 파일은 jsDelivr CDN 에서 내려받아요. 지도·공식 링크·투표 사이트·기사 원문을 누르면 해당 외부 사이트로 이동하며, 그 사이트의 정책이 적용돼요.</p>
        <h3>삭제</h3>
        <p>더보기 → 데이터 → 샘플 · 초기화에서 모든 정보를 지울 수 있고, 브라우저의 사이트 데이터 삭제로도 지워져요.</p>
        <p className="muted" style={{ marginTop: 14 }}>서버 동기화 기능이 추가되면 이 안내도 함께 업데이트돼요.</p>
      </article>
    </main>
  );
}

/*
 * 고지가 필요한 것만: 앱과 함께 배포되는 코드(MIT · ISC)와 앱이 직접 담아 배포하는 글꼴(next/font 로 내려받아 함께 배포, SIL OFL).
 * Pretendard · 에스코어드림 · Tossface 는 앱이 파일을 배포하지 않고 jsDelivr CDN 에서 바로 불러오므로 여기에는 적지 않음.
 */
const LICENSES: { group: string; items: { name: string; license: string; url: string }[] }[] = [
  {
    group: "글꼴",
    items: [
      { name: "Poppins", license: "SIL OFL 1.1", url: "https://fonts.google.com/specimen/Poppins" },
      { name: "Lato", license: "SIL OFL 1.1", url: "https://fonts.google.com/specimen/Lato" },
    ],
  },
  {
    group: "코드",
    items: [
      { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
      { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
      { name: "Lucide", license: "ISC", url: "https://lucide.dev/license" },
      { name: "idb", license: "ISC", url: "https://github.com/jakearchibald/idb" },
    ],
  },
];

export function LicensesScreen() {
  return (
    <main>
      <PageHeader back="/more/support" title="오픈소스 라이선스" />
      {LICENSES.map((g) => (
        <section key={g.group}>
          <h2 className={styles.groupTitle}>{g.group}</h2>
          <div className={`card ${styles.licenses}`}>
            {g.items.map((l) => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.license}>
                <strong>{l.name}</strong>
                <small>{l.license}</small>
                <ExternalLink size={14} className="muted" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export function AboutScreen({ version }: { version: string }) {
  return (
    <main>
      <PageHeader back="/more/support" title="앱 정보" />
      <section className={`card ${styles.preview}`}>
        <Illustration category="etc" className={styles.previewIllo} />
        <p className={`${styles.previewBig} num`}>wyd now</p>
        <p className="muted num" style={{ marginTop: 6 }}>
          버전 {version}
        </p>
        <p className={styles.previewBody} style={{ marginTop: 14 }}>
          ‘지금 뭐 해?’ — 좋아하는 아티스트가 오늘 어디서 무엇을 하는지, 모두가 같은 정보를 한눈에 확인할 수 있도록 만든 스케줄 앱이에요.
        </p>
      </section>
      <div className="list" style={{ marginTop: 16 }}>
        <Link href="/more/support/help" className="list-row">
          <span className="label">
            <strong>도움말</strong>
          </span>
        </Link>
        <Link href="/more/support/privacy" className="list-row">
          <span className="label">
            <strong>개인정보 안내</strong>
          </span>
        </Link>
        <Link href="/more/support/licenses" className="list-row">
          <span className="label">
            <strong>오픈소스 라이선스</strong>
          </span>
        </Link>
      </div>
    </main>
  );
}
