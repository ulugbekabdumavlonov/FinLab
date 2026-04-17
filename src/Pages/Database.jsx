import { useState, useRef, useEffect } from "react";
import { auth, db } from "../firebase";
import { store } from "./useAppStore";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map((v) => v.trim());
    const row = { _id: Date.now() + i };
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    return row;
  });
}

function formatSum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeDate(raw) {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const c = {
  bg:           "#f4f6f5",
  surface:      "#ffffff",
  surfaceHover: "#f7f9f8",
  border:       "#e4e9e6",
  borderMed:    "#d0d8d4",
  textPrimary:  "#1a1f1c",
  textSecondary:"#6b7a72",
  textMuted:    "#9eada5",
  accent:       "#3d8b6e",
  accentHover:  "#2f7059",
  accentSoft:   "rgba(61,139,110,0.10)",
  danger:       "#d94f4f",
  dangerSoft:   "rgba(217,79,79,0.09)",
  success:      "#3d8b6e",
  successSoft:  "rgba(61,139,110,0.09)",
};
const font = "'Inter', 'DM Sans', sans-serif";
const mono = "'DM Mono', monospace";

// ─── Wallet Selector Modal ────────────────────────────────────────────────────
function WalletModal({ wallets, loading, onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>Привязать к счёту</div>
        <div style={{ fontSize: 13, color: c.textSecondary, marginBottom: 20 }}>Выберите кошелёк из вашего списка счетов</div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: c.textMuted, fontSize: 14 }}>Загрузка счетов…</div>
        ) : wallets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: c.textMuted, fontSize: 14 }}>Нет доступных счетов</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                style={{ fontFamily: font, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.background = c.accentSoft; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.background = c.bg; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 1 }}>
                    {w.balance !== undefined
                      ? `${Number(w.balance || 0).toLocaleString("ru-RU")} ${w.currency || "UZS"}`
                      : w.entityName || "Без юрлица"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ fontFamily: font, fontSize: 13, padding: "9px 20px", background: "none", border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer", color: c.textSecondary, fontWeight: 500 }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload, disabled }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handle = (file) => {
    if (!file || !file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      onUpload({ name: file.name, rows });
      if (inputRef.current) inputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) handle(e.dataTransfer.files[0]); }}
      style={{
        border: `1.5px dashed ${drag ? c.accent : c.borderMed}`,
        borderRadius: 14, padding: "28px 32px", display: "flex", alignItems: "center", gap: 18,
        cursor: disabled ? "not-allowed" : "pointer",
        background: drag ? c.accentSoft : c.surface, transition: "all 0.2s",
        marginBottom: 24, opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary }}>Загрузить CSV файл</div>
        <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 3 }}>
          Поддерживаются колонки: Date, Sum, Counterparty, Category, Project, Details
        </div>
      </div>
      <div style={{ marginLeft: "auto", fontSize: 12, color: "#fff", fontWeight: 500, background: c.accent, padding: "8px 16px", borderRadius: 8 }}>
        Выбрать файл
      </div>
      <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handle(e.target.files[0])} />
    </div>
  );
}

// ─── Uploaded files list ──────────────────────────────────────────────────────
function FileRow({ file, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderBottom: `1px solid ${c.border}`, background: hover ? c.surfaceHover : "transparent", transition: "background 0.15s" }}
    >
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary }}>{file.fileName}</div>
            <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>Загружено {file.uploadedAt}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 20px", color: c.textSecondary, fontSize: 13 }}>{file.count} операций</td>
      <td style={{ padding: "14px 20px", fontFamily: mono, fontSize: 13, color: file.total < 0 ? c.danger : c.success, fontWeight: 500 }}>
        {file.total >= 0 ? "+" : ""}{formatSum(file.total)}
      </td>
      <td style={{ padding: "14px 20px", fontSize: 13 }}>
        {file.walletName ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: c.accentSoft, color: c.accent, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
            {file.walletName}
          </span>
        ) : (
          <span style={{ color: c.textMuted, fontSize: 12 }}>—</span>
        )}
      </td>
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => onDelete(file.fileName, file.walletId, file.total)}
            style={{ fontFamily: font, fontSize: 12, padding: "6px 12px", background: c.dangerSoft, color: c.danger, border: `1px solid rgba(217,79,79,0.25)`, borderRadius: 7, cursor: "pointer" }}
          >
            Удалить файл
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [fileGroups, setFileGroups] = useState([]);
  const [toast, setToast] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [pendingFile, setPendingFile] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load imported transactions ────────────────────────────────────────────
  const loadImported = async () => {
    try {
      // FIX: убрали orderBy("createdAt") — он отсекал документы без этого поля.
      // Фильтрация по source === "imported" происходит на клиенте.
      const snap = await getDocs(userCol("transactions"));
      const imported = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.source === "imported");

      const groupMap = {};
      imported.forEach((t) => {
        const key = t.fileName || "Без имени";
        if (!groupMap[key]) {
          groupMap[key] = {
            fileName:   key,
            walletId:   t.walletId   || "",
            walletName: t.walletName || "",
            uploadedAt: t.uploadedAt || "",
            total:      0,
            count:      0,
            docIds:     [],
          };
        }
        groupMap[key].total  += parseFloat(t.amount) || 0;
        groupMap[key].count  += 1;
        groupMap[key].docIds.push(t.id);
      });

      setFileGroups(Object.values(groupMap));
    } catch (e) {
      showToast("Ошибка загрузки данных", "danger");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { loadImported(); }, []);

  // ── Load wallets ──────────────────────────────────────────────────────────
  const loadWallets = async () => {
    setWalletsLoading(true);
    try {
      const snap = await getDocs(userCol("accounts"));
      setWallets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Не удалось загрузить счета", "danger");
    } finally {
      setWalletsLoading(false);
    }
  };

  // ── When CSV picked → show wallet modal ───────────────────────────────────
  const handleFilePicked = (parsed) => {
    setPendingFile(parsed);
    setShowWalletModal(true);
    loadWallets();
  };

  // ── After wallet selected → write rows to user's transactions ─────────────
  const handleWalletSelected = async (wallet) => {
    if (!pendingFile) return;

    const user = auth.currentUser;
    if (!user) {
      showToast("Ошибка: пользователь не авторизован", "danger");
      return;
    }

    setShowWalletModal(false);
    setUploading(true);

    try {
      const today = new Date().toLocaleDateString("ru-RU");
      // FIX: уникальный ключ для каждого импорта — имя файла + timestamp
      // чтобы повторные загрузки одного файла не сливались в одну строку
      const importKey = `${pendingFile.name}__${Date.now()}`;
      const total = pendingFile.rows.reduce(
        (sum, r) => sum + (parseFloat(r.Sum) || 0),
        0
      );

      const writes = pendingFile.rows.map((row) => {
        const amount = parseFloat(row.Sum) || 0;
        return addDoc(userCol("transactions"), {
          date:         normalizeDate(row.Date || ""),
          amount,
          counterparty: row.Counterparty || "",
          category:     row.Category     || "",
          direction:    row.Project       || "",
          description:  row.Details      || "",
          type:         amount >= 0 ? "income" : "expense",
          walletId:     wallet.id,
          walletName:   wallet.name,
          source:       "imported",
          fileName:     importKey,
          uploadedAt:   today,
          createdAt:    serverTimestamp(),
        });
      });

      await Promise.all(writes);

      // Обновляем баланс счёта
      await updateDoc(userDoc("accounts", wallet.id), {
        balance: increment(total),
      });
      await store.refresh();

      showToast(`Файл «${pendingFile.name}» загружен (${pendingFile.rows.length} операций)`);
      loadImported();
    } catch (e) {
      showToast("Ошибка при загрузке файла: " + e.message, "danger");
    } finally {
      setPendingFile(null);
      setUploading(false);
    }
  };

  // ── Delete all transactions belonging to a file ────────────────────────────
  const handleDeleteFile = async (fileName, walletId, total) => {
    try {
      // FIX: убрали orderBy — читаем все транзакции и фильтруем на клиенте
      const snap = await getDocs(userCol("transactions"));
      const toDelete = snap.docs.filter(
        (d) => d.data().source === "imported" && d.data().fileName === fileName
      );

      await Promise.all(toDelete.map((d) => deleteDoc(userDoc("transactions", d.id))));

      if (walletId && total !== 0) {
        await updateDoc(userDoc("accounts", walletId), {
          balance: increment(-total),
        });
      }

      await store.refresh();

      setFileGroups((prev) => prev.filter((f) => f.fileName !== fileName));
      showToast("Файл удалён", "danger");
    } catch (e) {
      showToast("Ошибка при удалении", "danger");
    }
  };

  const totalOps = fileGroups.reduce((s, f) => s + f.count, 0);
  const totalSum = fileGroups.reduce((s, f) => s + f.total, 0);

  return (
    <div style={{ fontFamily: font, color: c.textPrimary, minHeight: "100vh", padding: "2rem 2.5rem", background: "transparent" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        input::placeholder { color: #b0bbb5; }
        button:focus { outline: none; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 300, background: toast.type === "danger" ? "#fff0f0" : "#f0faf5", border: `1px solid ${toast.type === "danger" ? c.danger : c.accent}`, color: toast.type === "danger" ? c.danger : c.accent, padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.09)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, margin: 0, color: c.textPrimary }}>Импорт операций</h1>
        <p style={{ fontSize: 14, color: c.textSecondary, margin: "6px 0 0" }}>Загружайте банковские выписки — каждая строка сохраняется как отдельная транзакция</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Файлов загружено", val: fileGroups.length },
          { label: "Всего операций",   val: totalOps },
          { label: "Общая сумма",      val: (totalSum >= 0 ? "+" : "") + formatSum(totalSum), mono: true, color: totalSum < 0 ? c.danger : c.success },
        ].map(({ label, val, mono: isMono, color }) => (
          <div key={label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: isMono ? mono : font, color: color || c.textPrimary, letterSpacing: -0.5 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <UploadZone onUpload={handleFilePicked} disabled={uploading} />
      {uploading && (
        <div style={{ textAlign: "center", color: c.accent, fontSize: 13, marginTop: -16, marginBottom: 20 }}>
          Сохранение транзакций в базу данных…
        </div>
      )}

      {/* Files table */}
      {pageLoading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: c.textMuted, fontSize: 14, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
          Загрузка…
        </div>
      ) : fileGroups.length > 0 ? (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Загруженные файлы</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>{fileGroups.length} файл(ов)</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: c.bg }}>
                {["Файл", "Операций", "Сумма", "Счёт", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${c.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileGroups.map((file) => (
                <FileRow key={file.fileName} file={file} onDelete={handleDeleteFile} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: c.textMuted, fontSize: 14, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14 }}>
          Нет загруженных файлов. Загрузите CSV выше.
        </div>
      )}

      {/* Wallet picker modal */}
      {showWalletModal && (
        <WalletModal
          wallets={wallets}
          loading={walletsLoading}
          onSelect={handleWalletSelected}
          onClose={() => { setShowWalletModal(false); setPendingFile(null); }}
        />
      )}
    </div>
  );
}
