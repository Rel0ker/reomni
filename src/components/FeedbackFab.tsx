import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useT } from "../i18n/PrefsContext";
import { api } from "../lib/api";
import { Icon } from "./Icon";

const ACCEPT = "image/*,video/*";

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FeedbackFab({
  onToast,
}: {
  onToast?: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const t = useT();
  const location = useLocation();
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  function reset() {
    setMessage("");
    setContact("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.sendFeedback({
        message,
        contact: contact.trim() || undefined,
        page: `${location.pathname}${location.search}`,
        file,
      });
      onToast?.(t("feedback.thanks"), "good");
      reset();
      setOpen(false);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : t("common.error"), "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        aria-label={t("feedback.aria")}
        title={t("feedback.aria")}
        onClick={() => setOpen(true)}
      >
        <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </button>

      {open ? (
        <div
          className="more-sheet feedback-sheet"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="feedback-modal-top">
              <div>
                <div className="feedback-modal-title" id={titleId}>
                  {t("feedback.title")}
                </div>
                <div className="mute tiny">{t("feedback.hint")}</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={t("common.close")}
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                <Icon d="M6 6l12 12M18 6L6 18" />
              </button>
            </div>

            <form className="feedback-form" onSubmit={(e) => void submit(e)}>
              <label className="feedback-label">
                {t("feedback.message")}
                <textarea
                  className="bare-input feedback-textarea"
                  required
                  minLength={3}
                  maxLength={8000}
                  rows={5}
                  placeholder={t("feedback.messagePh")}
                  value={message}
                  disabled={busy}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>

              <label className="feedback-label">
                {t("feedback.contact")}
                <span className="mute tiny"> · {t("feedback.optional")}</span>
                <input
                  className="bare-input"
                  type="text"
                  maxLength={240}
                  placeholder={t("feedback.contactPh")}
                  value={contact}
                  disabled={busy}
                  onChange={(e) => setContact(e.target.value)}
                />
              </label>

              <div className="feedback-attach">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="feedback-file-input"
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.files?.[0] || null;
                    if (next && next.size > 20 * 1024 * 1024) {
                      onToast?.(t("feedback.fileTooBig"), "bad");
                      e.target.value = "";
                      setFile(null);
                      return;
                    }
                    setFile(next);
                  }}
                />
                {!file ? (
                  <button
                    type="button"
                    className="feedback-attach-btn"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Icon d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    <span>{t("feedback.attach")}</span>
                  </button>
                ) : (
                  <div className="feedback-preview">
                    {preview && file.type.startsWith("image/") ? (
                      <img src={preview} alt="" />
                    ) : preview && file.type.startsWith("video/") ? (
                      <video src={preview} controls playsInline />
                    ) : (
                      <div className="mute">{file.name}</div>
                    )}
                    <div className="feedback-preview-meta">
                      <div className="tiny">
                        {file.name}
                        <span className="mute"> · {fmtSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        disabled={busy}
                        onClick={() => {
                          setFile(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                      >
                        {t("feedback.remove")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="feedback-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="primary-btn" disabled={busy}>
                  {busy ? t("feedback.sending") : t("feedback.send")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
