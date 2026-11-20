import type { DictKey } from "../i18n/dict";
import { useT } from "../i18n/PrefsContext";

export function PageBrand({ k }: { k: DictKey }) {
  const t = useT();
  return <div className="brand">{t(k)}</div>;
}
