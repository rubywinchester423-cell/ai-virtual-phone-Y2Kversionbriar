"use client";

// 手动绑定已有的 Supabase 云项目：重装 / 换设备后，云备份的连接信息（地址 + 密钥）
// 只存在本机，新环境默认不认识旧项目。在这里填回原项目的地址和 service_role key，
// 就能直接读取旧云备份，不会新建项目，也不占用 Supabase 项目名额。

import { useState } from "react";
import {
    loadCloudBackupConfig,
    normalizeBackupUrl,
    saveCloudBackupConfig,
    type CloudBackupConfig,
} from "@/lib/cloud-backup/config";
import { testCloudBackupConnection } from "@/lib/cloud-backup/storage-client";
import { Input } from "@/components/ui/form";

export function CloudManualBind({ onBound }: { onBound?: (config: CloudBackupConfig) => void }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [key, setKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    const bind = async () => {
        if (busy) return;
        const nextUrl = normalizeBackupUrl(url);
        const nextKey = key.trim();
        if (!nextUrl || !nextKey) {
            setMessage("请填写项目地址和 service_role key。");
            return;
        }
        setBusy(true);
        setMessage("正在测试连接…");
        try {
            const next: CloudBackupConfig = {
                ...loadCloudBackupConfig(),
                url: nextUrl,
                key: nextKey,
                // 手动绑定的项目不标记为「本应用创建」，部署流程仍会走新建，绝不改写这个项目
                managedProjectRef: undefined,
                managedOrganizationSlug: undefined,
            };
            const result = await testCloudBackupConnection(next);
            if (!result.ok) {
                setMessage(`连接失败：${result.error}`);
                return;
            }
            saveCloudBackupConfig(next);
            onBound?.(next);
            setKey("");
            setMessage("已绑定。现在可以在上方「从云端恢复」里选择备份。");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "绑定失败。");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="menu-item data-readonly-item" style={{ display: "block" }}>
            <button
                type="button"
                className="ui-btn ui-btn-outline"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                {open ? "收起手动绑定" : "手动绑定已有云项目"}
            </button>
            {open && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className="menu-desc">
                        用于重装或换设备后连回原来的 Supabase 项目。地址形如 https://xxxx.supabase.co；
                        密钥在该项目 Project Settings → API Keys 里，请填 service_role（不是 anon）。
                    </span>
                    <Input
                        placeholder="项目地址 https://xxxx.supabase.co"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <Input
                        placeholder="service_role key"
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <button type="button" className={`ui-btn ui-btn-outline ${busy ? "is-busy" : ""}`} onClick={bind} disabled={busy}>
                        保存并测试连接
                    </button>
                    {message && <span className="menu-desc">{message}</span>}
                </div>
            )}
        </div>
    );
}
