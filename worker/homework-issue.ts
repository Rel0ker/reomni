import {
  omniPost,
  omniPostForm,
  type OmniSession,
} from "./omni";

type FileTokenCreds = {
  token?: string;
  url?: string;
  dir?: Record<string, { src?: string }>;
};

export type IssueHomeworkInput = {
  descr: string;
  lenta: string | number;
  date: string;
  group: string | number;
  spec: string | number | null;
  source: string | number | null;
  id_base_spec: string | number | null;
  dz_theme: string;
  deadline: string | number;
  type?: string | number;
  /** Already-hosted file URL (recommended material). */
  filenameUrl?: string | null;
  recommendedJson?: string | null;
  recommendedMaterialId?: string | number | null;
  file?: File | null;
};

function appendField(form: FormData, key: string, value: unknown) {
  if (value == null || value === "") {
    form.append(key, "");
    return;
  }
  form.append(key, String(value));
}

async function uploadHomeworkFile(
  credentials: FileTokenCreds,
  file: File,
  preferredName?: string,
): Promise<string> {
  const dir = credentials.dir?.homeworkDirId?.src;
  if (!credentials.token || !credentials.url || !dir) {
    throw new Error("Нет токена загрузки файлов");
  }
  const params = new FormData();
  params.append("directory", dir);
  if (preferredName) params.append("files[]", file, preferredName);
  else params.append("files[]", file);

  const res = await fetch(`${credentials.url}/api/v1/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.token}` },
    body: params,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Файловый сервер вернул не JSON");
  }
  if (!res.ok) {
    throw new Error(`Ошибка загрузки файла (${res.status})`);
  }
  const link = Array.isArray(data)
    ? (data[0] as { link?: string })?.link
    : (data as { link?: string })?.link;
  if (!link) throw new Error("Файл загружен без ссылки");
  return String(link);
}

/**
 * Omni custom homework: get file token → upload → POST /presents/new-homework (FormData).
 */
export async function issueOmniHomework(
  origin: string,
  session: OmniSession,
  input: IssueHomeworkInput,
): Promise<{ data: unknown; jar: string }> {
  const hasFile = !!(input.file && input.file.size > 0);
  const hasUrl = !!(input.filenameUrl && String(input.filenameUrl).trim());
  if (!hasFile && !hasUrl) {
    throw new Error("Нужен файл ДЗ или материал из рекомендованных");
  }

  let filename = hasUrl ? String(input.filenameUrl).trim() : "";
  let jar = session.omniCookie;

  if (hasFile) {
    const tokenRes = await omniPost<FileTokenCreds>(
      origin,
      { ...session, omniCookie: jar },
      "/auth/file-token",
      {},
    );
    jar = tokenRes.jar;
    filename = await uploadHomeworkFile(tokenRes.data, input.file!);
  }

  const form = new FormData();
  appendField(form, "descr", input.descr ?? "");
  appendField(form, "lenta", input.lenta);
  appendField(form, "date", input.date);
  appendField(form, "group", input.group);
  appendField(form, "spec", input.spec);
  appendField(form, "source", input.source);
  appendField(form, "id_base_spec", input.id_base_spec);
  appendField(form, "dz_theme", input.dz_theme ?? "");
  appendField(form, "deadline", input.deadline ?? 0);
  appendField(form, "type", input.type ?? 0);
  if (filename) appendField(form, "filename", filename);
  if (input.recommendedJson) {
    appendField(form, "recommended", input.recommendedJson);
  }
  if (input.recommendedMaterialId != null && input.recommendedMaterialId !== "") {
    appendField(form, "recommended_material", input.recommendedMaterialId);
  }

  const result = await omniPostForm<{
    success?: string;
    error?: string;
  }>(origin, { ...session, omniCookie: jar }, "/presents/new-homework", form);

  if (result.data && typeof result.data === "object" && result.data.error) {
    throw new Error(String(result.data.error));
  }

  return { data: result.data, jar: result.jar };
}
