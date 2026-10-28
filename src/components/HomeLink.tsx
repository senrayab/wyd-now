import Link from "next/link";
import { House } from "lucide-react";

/** 탭 화면(캘린더·뉴스·투표·더보기) 제목 앞의 홈 바로가기: 흰 원 없이 아이콘만 */
export default function HomeLink() {
  return (
    <Link href="/" className="home-link" aria-label="홈으로">
      <House size={21} strokeWidth={1.7} />
    </Link>
  );
}
