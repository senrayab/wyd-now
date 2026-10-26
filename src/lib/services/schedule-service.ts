import { getDataStore } from "../storage";
import type { Schedule, ScheduleInput } from "../storage/types";
import { applyImageChange, type ImageChange } from "./image-attach";

export type ScheduleFormValues = Omit<ScheduleInput, "imageId">;

const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+/i;

export function isValidUrl(value: string) {
  return URL_RE.test(value.trim());
}

/** 입력 검증. 문제가 있으면 필드별 메시지를 돌려줍니다. */
export function validateSchedule(values: ScheduleFormValues) {
  const errors: Partial<Record<"title" | "endAt" | "url" | "links", string>> = {};
  if (!values.title.trim()) errors.title = "제목을 입력해 주세요.";
  if (values.endAt < values.startAt) errors.endAt = "종료가 시작보다 빨라요.";
  if (values.url && !isValidUrl(values.url)) errors.url = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  if (values.links.some((l) => !l.label.trim() || !isValidUrl(l.url))) {
    errors.links = "관련 링크의 이름과 주소(https://…)를 확인해 주세요.";
  }
  return errors;
}

export async function saveSchedule(
  values: ScheduleFormValues,
  image: ImageChange,
  existing?: Schedule,
): Promise<Schedule> {
  const { schedules } = getDataStore();
  const clean: ScheduleFormValues = {
    ...values,
    title: values.title.trim(),
    place: values.place?.trim() || undefined,
    url: values.url?.trim() || undefined,
    description: values.description?.trim() || undefined,
    links: values.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
  };
  if (existing) {
    const imageId = await applyImageChange(image, existing.imageId, { kind: "schedule", id: existing.id });
    return schedules.update(existing.id, { ...clean, imageId });
  }
  const created = await schedules.create({ ...clean, imageId: undefined });
  if (image.kind !== "replace") return created;
  const imageId = await applyImageChange(image, undefined, { kind: "schedule", id: created.id });
  return schedules.update(created.id, { imageId });
}

export async function deleteSchedule(schedule: Schedule) {
  const { schedules, images } = getDataStore();
  if (schedule.imageId) await images.remove(schedule.imageId);
  await schedules.remove(schedule.id);
}
