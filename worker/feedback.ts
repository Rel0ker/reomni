import type { OmniEnv, OmniSession } from "./omni";
import { newId } from "./session";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (KV limit headroom)
const ALLOWED_PREFIX = /^(image\/|video\/)/i;

export type FeedbackRow = {
  id: string;
  username: string;
  teachName: string | null;
  page: string | null;
  message: string;
  contact: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt: number;
  status: string;
  hasFile: boolean;
};

function fileKey(id: string) {
  return `fbfile:${id}`;
}

export async function createFeedback(
  env: OmniEnv,
  session: OmniSession,
  args: {
    message: string;
    contact?: string | null;
    page?: string | null;
    file?: File | null;
  },
) {
  const message = args.message.trim();
  if (message.length < 3) {
    throw new Error("Напишите сообщение (минимум 3 символа)");
  }
  if (message.length > 8000) {
    throw new Error("Слишком длинное сообщение");
  }
  const contact = (args.contact || "").trim().slice(0, 240) || null;
  const page = (args.page || "").trim().slice(0, 240) || null;

  let fileName: string | null = null;
  let fileType: string | null = null;
  let fileSize: number | null = null;
  let bytes: ArrayBuffer | null = null;

  if (args.file && args.file.size > 0) {
    if (args.file.size > MAX_BYTES) {
      throw new Error("Файл больше 20 МБ — сожмите или обрежьте");
    }
    const type = args.file.type || "application/octet-stream";
    if (!ALLOWED_PREFIX.test(type)) {
      throw new Error("Можно прикрепить только фото или видео");
    }
    fileName = (args.file.name || "attachment").slice(0, 180);
    fileType = type.slice(0, 120);
    fileSize = args.file.size;
    bytes = await args.file.arrayBuffer();
  }

  const id = newId();
  const createdAt = Date.now();

  if (bytes) {
    await env.SESSIONS.put(fileKey(id), bytes, {
      expirationTtl: 60 * 60 * 24 * 180, // 180 days
      metadata: { fileName, fileType, fileSize },
    });
  }

  await env.DB.prepare(
    `INSERT INTO feedback
      (id, username, teach_name, page, message, contact, file_name, file_type, file_size, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
  )
    .bind(
      id,
      session.username,
      session.teachName ?? null,
      page,
      message,
      contact,
      fileName,
      fileType,
      fileSize,
      createdAt,
    )
    .run();

  return { id, createdAt, hasFile: !!bytes };
}

export async function listFeedback(env: OmniEnv, limit = 80) {
  const rows = await env.DB.prepare(
    `SELECT id, username, teach_name, page, message, contact,
            file_name, file_type, file_size, created_at, status
     FROM feedback
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(Math.min(Math.max(limit, 1), 200))
    .all<{
      id: string;
      username: string;
      teach_name: string | null;
      page: string | null;
      message: string;
      contact: string | null;
      file_name: string | null;
      file_type: string | null;
      file_size: number | null;
      created_at: number;
      status: string;
    }>();

  return (rows.results || []).map(
    (r): FeedbackRow => ({
      id: r.id,
      username: r.username,
      teachName: r.teach_name,
      page: r.page,
      message: r.message,
      contact: r.contact,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: r.file_size,
      createdAt: r.created_at,
      status: r.status,
      hasFile: !!(r.file_name && r.file_size),
    }),
  );
}

export async function getFeedbackFile(env: OmniEnv, id: string) {
  const meta = await env.DB.prepare(
    `SELECT file_name, file_type, file_size FROM feedback WHERE id = ?`,
  )
    .bind(id)
    .first<{
      file_name: string | null;
      file_type: string | null;
      file_size: number | null;
    }>();
  if (!meta?.file_name) return null;
  const obj = await env.SESSIONS.get(fileKey(id), { type: "arrayBuffer" });
  if (!obj) return null;
  return {
    bytes: obj,
    fileName: meta.file_name,
    fileType: meta.file_type || "application/octet-stream",
    fileSize: meta.file_size || obj.byteLength,
  };
}

export async function markFeedback(
  env: OmniEnv,
  id: string,
  status: "new" | "seen" | "done",
) {
  await env.DB.prepare(`UPDATE feedback SET status = ? WHERE id = ?`)
    .bind(status, id)
    .run();
}
