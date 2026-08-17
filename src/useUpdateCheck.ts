import { useEffect, useState } from "react";
import { useSettingsStore } from "./settingsStore";
import { APP_VERSION } from "./version";

const REPO = "latticeworks-studio/AssistaskManager-v2";

interface UpdateInfo {
  version: string;
  downloadUrl: string;
}

function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const dismissedVersion = useSettingsStore((s) => s.dismissedUpdateVersion);
  const update = useSettingsStore((s) => s.update);

  useEffect(() => {
    let cancelled = false;

    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.tag_name) return;
        const version = String(data.tag_name).replace(/^v/, "");
        if (!isNewer(version, APP_VERSION)) return;

        const assets: Array<{ name: string; browser_download_url: string }> = data.assets ?? [];
        const asset = assets.find((a) => a.name?.endsWith(".msi"));

        setUpdateInfo({
          version,
          downloadUrl: asset?.browser_download_url ?? data.html_url,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    if (updateInfo) update({ dismissedUpdateVersion: updateInfo.version });
  };

  const visible = updateInfo !== null && updateInfo.version !== dismissedVersion;

  return { updateInfo: visible ? updateInfo : null, dismiss };
}
