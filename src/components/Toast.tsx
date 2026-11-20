import { useEffect } from "react";

export function Toast({
  text,
  tone = "neutral",
  onDone,
}: {
  text: string;
  tone?: "neutral" | "good" | "bad";
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone, text]);

  return <div className={`toast ${tone === "neutral" ? "" : tone}`}>{text}</div>;
}
