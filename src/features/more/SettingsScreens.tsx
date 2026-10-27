"use client";

import PageHeader from "@/components/PageHeader";
import Illustration from "@/components/Illustration";
import { setPrefs, usePrefs, type Prefs } from "@/lib/prefs";
import styles from "./Guide.module.css";

interface Option<V> {
  value: V;
  label: string;
  description?: string;
}

function OptionGroup<V extends string | number | boolean>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={`list ${styles.options}`} role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={styles.option} onClick={() => onChange(o.value)}>
            <span className="label">
              <strong>{o.label}</strong>
              {o.description && <small>{o.description}</small>}
            </span>
            <span className={styles.radio} />
          </button>
        ))}
      </div>
    </>
  );
}

export function ThemeSettings() {
  const prefs = usePrefs();
  return (
    <main>
      <PageHeader back="/more/settings" title="화면 테마" />
      <OptionGroup<Prefs["theme"]>
        title="밝기"
        value={prefs.theme}
        onChange={(theme) => setPrefs({ theme })}
        options={[
          { value: "system", label: "시스템 설정 따르기", description: "기기의 라이트·다크 설정에 맞춰요" },
          { value: "light", label: "라이트", description: "밝은 그레이 바탕" },
          { value: "dark", label: "다크", description: "어두운 바탕, 밤에 보기 편해요" },
        ]}
      />
    </main>
  );
}

export function FontSettings() {
  const prefs = usePrefs();
  return (
    <main>
      <PageHeader back="/more/settings" title="글꼴" />

      <section className={`card ${styles.preview}`} aria-label="미리보기">
        <Illustration category="fansign" className={styles.previewIllo} />
        <p className={`${styles.previewBig} num`}>Sat 24th</p>
        <p className={styles.previewTitle}>2nd Fan-Con 〈Afterglow〉 🎤</p>
        <p className={styles.previewBody}>
          10월 24일 오후 6시, 올림픽공원 KSPO DOME
          <br />
          Doors open 17:00 · 0123456789 ✨
        </p>
      </section>

      <OptionGroup<Prefs["fontKo"]>
        title="한글"
        value={prefs.fontKo}
        onChange={(fontKo) => setPrefs({ fontKo })}
        options={[
          { value: "pretendard", label: "프리텐다드", description: "또렷하고 균형 잡힌 기본 글꼴" },
          { value: "scdream", label: "에스코어드림", description: "부드럽고 둥근 느낌" },
        ]}
      />
      <OptionGroup<Prefs["fontEn"]>
        title="영문 · 숫자"
        value={prefs.fontEn}
        onChange={(fontEn) => setPrefs({ fontEn })}
        options={[
          { value: "poppins", label: "Poppins", description: "기하학적이고 또렷한 숫자" },
          { value: "lato", label: "Lato", description: "차분하고 가독성 좋은 글꼴" },
        ]}
      />
      <p className="muted" style={{ fontSize: 12.5, margin: "14px 6px", lineHeight: 1.6 }}>
        이모지는 항상 토스페이스로 표시돼요. 글꼴 설정은 이 기기에만 저장돼요.
      </p>
    </main>
  );
}

export function CalendarSettings() {
  const prefs = usePrefs();
  return (
    <main>
      <PageHeader back="/more/settings" title="캘린더" />
      <OptionGroup<Prefs["weekStart"]>
        title="주 시작 요일"
        value={prefs.weekStart}
        onChange={(weekStart) => setPrefs({ weekStart })}
        options={[
          { value: 0, label: "일요일" },
          { value: 1, label: "월요일" },
        ]}
      />
      <OptionGroup<Prefs["hour12"]>
        title="시간 표시"
        value={prefs.hour12}
        onChange={(hour12) => setPrefs({ hour12 })}
        options={[
          { value: false, label: "24시간", description: "18:00" },
          { value: true, label: "12시간", description: "오후 6:00" },
        ]}
      />
      <OptionGroup<Prefs["calendarView"]>
        title="캘린더 기본 보기"
        value={prefs.calendarView}
        onChange={(calendarView) => setPrefs({ calendarView })}
        options={[
          { value: "month", label: "월간", description: "달력에서 날짜를 골라 보기" },
          { value: "list", label: "목록", description: "다가오는 일정을 날짜순으로" },
        ]}
      />
      <OptionGroup<Prefs["showVoteDeadlines"]>
        title="투표 마감일 표시"
        value={prefs.showVoteDeadlines}
        onChange={(showVoteDeadlines) => setPrefs({ showVoteDeadlines })}
        options={[
          { value: false, label: "표시 안 함", description: "캘린더에는 일정만 보여요" },
          { value: true, label: "옅은 점으로 표시", description: "월간 캘린더의 마감일에 점이 찍히고, 날짜를 누르면 마감하는 투표가 보여요" },
        ]}
      />
    </main>
  );
}
