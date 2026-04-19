// TeamPage.jsx
// Структура: users/{ownerUid}/team/{memberUid} + invites/{inviteId}

import { useState, useEffect } from "react";
import {
  collection, doc, getDoc, getDocs, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp, query, where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const ALL_PERMISSIONS = [
  { key: "cashflow",           label: "Cash Flow",             group: "Отчёты"      },
  { key: "pl",                 label: "P&L",                   group: "Отчёты"      },
  { key: "reports",            label: "Дашборд",               group: "Отчёты"      },
  { key: "transactions",       label: "Транзакции (просмотр)", group: "Данные"      },
  { key: "transactions_write", label: "Транзакции (запись)",   group: "Данные"      },
  { key: "accounts",           label: "Счета (просмотр)",      group: "Данные"      },
  { key: "accounts_write",     label: "Счета (запись)",        group: "Данные"      },
  { key: "categories",         label: "Категории (просмотр)",  group: "Справочники" },
  { key: "categories_write",   label: "Категории (запись)",    group: "Справочники" },
];

const GROUPS = [...new Set(ALL_PERMISSIONS.map((p) => p.group))];

const PRESETS = {
  viewer:  Object.fromEntries(ALL_PERMISSIONS.map((p) => [p.key, ["cashflow","pl","reports","transactions","accounts","categories"].includes(p.key)])),
  manager: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p.key, !["accounts_write","categories_write"].includes(p.key)])),
  admin:   Object.fromEntries(ALL_PERMISSIONS.map((p) => [p.key, true])),
  none:    Object.fromEntries(ALL_PERMISSIONS.map((p) => [p.key, false])),
};

const C = {
  ink:        "#111827",
  inkMid:     "#374151",
  inkLight:   "#9ca3af",
  inkFaint:   "#d1d5db",
  surface:    "#ffffff",
  surfaceAlt: "#f9fafb",
  border:     "#e5e7eb",
  borderMid:  "#d1d5db",
  pos:        "#15803d",
  posBg:      "#f0fdf4",
  neg:        "#b91c1c",
  negBg:      "#fef2f2",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
  warn:       "#d97706",
  warnBg:     "#fffbeb",
};

function useIsMobile() {
  const [v, set] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => set(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
}

function Avatar({ email, size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: C.accentBg, border: `1px solid ${C.accent}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: C.accent,
    }}>
      {(email || "?")[0].toUpperCase()}
    </div>
  );
}

function PresetBar({ onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: C.inkLight }}>Пресет:</span>
      {[["viewer","Viewer"],["manager","Manager"],["admin","Admin"],["none","Очистить"]].map(([key, lbl]) => (
        <button key={key} onClick={() => onSelect({ ...PRESETS[key] })} style={{
          fontFamily: "inherit", fontSize: 11, padding: "3px 10px",
          borderRadius: 5, border: `1px solid ${C.border}`,
          background: C.surface, color: C.inkMid, cursor: "pointer",
        }}>
          {lbl}
        </button>
      ))}
    </div>
  );
}

function PermissionEditor({ permissions, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {GROUPS.map((group) => (
        <div key={group}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkLight, marginBottom: 6 }}>
            {group}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => {
              const active = permissions[p.key] === true;
              return (
                <button key={p.key} onClick={() => onChange({ ...permissions, [p.key]: !active })} style={{
                  fontFamily: "inherit", fontSize: 12, padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accentBg : C.surface,
                  color: active ? C.accent : C.inkMid,
                  cursor: "pointer", transition: "all 0.12s",
                  fontWeight: active ? 500 : 400,
                }}>
                  {active ? "✓ " : ""}{p.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────
function MemberCard({ member, ownerUid, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [perms,   setPerms]   = useState(member.permissions || {});
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  const activeCount = Object.values(member.permissions || {}).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", ownerUid, "team", member.id), {
        permissions: perms, updatedAt: serverTimestamp(),
      });
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
        <Avatar email={member.email} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {member.displayName || member.email}
          </div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1 }}>{member.email}</div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "1px 6px", borderRadius: 4, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
              {member.role || "viewer"}
            </span>
            <span>{activeCount} из {ALL_PERMISSIONS.length} разрешений</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => { setPerms({ ...(member.permissions || {}) }); setEditing(!editing); setConfirm(false); }}
            style={{
              fontFamily: "inherit", fontSize: 12, padding: "5px 12px", borderRadius: 5, cursor: "pointer",
              border: `1px solid ${editing ? C.borderMid : C.accent}`,
              background: editing ? C.surfaceAlt : C.accentBg,
              color: editing ? C.inkMid : C.accent,
            }}
          >
            {editing ? "Отмена" : "Права"}
          </button>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ fontFamily: "inherit", fontSize: 12, padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.neg, cursor: "pointer" }}>
              ✕
            </button>
          ) : (
            <button onClick={() => onRemove(member.id)} style={{ fontFamily: "inherit", fontSize: 12, padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.neg}`, background: C.negBg, color: C.neg, cursor: "pointer", fontWeight: 600 }}>
              Удалить?
            </button>
          )}
        </div>
      </div>

      {!editing && (
        <div style={{ padding: "0 16px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ALL_PERMISSIONS.map((p) => {
            const active = member.permissions?.[p.key];
            return (
              <span key={p.key} style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                background: active ? C.posBg : C.surfaceAlt,
                color: active ? C.pos : C.inkFaint,
                border: `1px solid ${active ? "#bbf7d0" : C.border}`,
              }}>
                {p.label}
              </span>
            );
          })}
        </div>
      )}

      {editing && (
        <div style={{ padding: "14px 16px", background: C.surfaceAlt, borderTop: `1px solid ${C.border}` }}>
          <PresetBar onSelect={setPerms} />
          <PermissionEditor permissions={perms} onChange={setPerms} />
          <button onClick={handleSave} disabled={saving} style={{
            marginTop: 14, fontFamily: "inherit", fontSize: 13, padding: "7px 22px",
            borderRadius: 6, border: "none", background: C.accent, color: "#fff",
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Pending invite row ───────────────────────────────────────────────────────
function InviteRow({ invite, onCancel }) {
  const [copied, setCopied] = useState(false);

  const link = `${window.location.origin}/invite/${invite.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.warn}20` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar email={invite.email || "?"} size={30} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>
            {invite.email || "Ссылка без email"}
          </div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1 }}>
            ожидает принятия
          </div>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.warnBg, color: C.warn, border: `1px solid ${C.warn}40`, whiteSpace: "nowrap" }}>
          pending
        </span>
        <button onClick={onCancel} style={{ fontFamily: "inherit", fontSize: 11, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.neg, cursor: "pointer" }}>
          Отменить
        </button>
      </div>
      {/* Invite link */}
      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{
          flex: 1, fontSize: 11, padding: "6px 10px",
          background: C.surfaceAlt, border: `1px solid ${C.border}`,
          borderRadius: 5, color: C.inkMid, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {link}
        </div>
        <button onClick={copyLink} style={{
          fontFamily: "inherit", fontSize: 11, padding: "6px 12px",
          borderRadius: 5, border: `1px solid ${copied ? C.pos : C.accent}`,
          background: copied ? C.posBg : C.accentBg,
          color: copied ? C.pos : C.accent,
          cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
        }}>
          {copied ? "✓ Скопировано" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

// ─── Invite form ──────────────────────────────────────────────────────────────
function InviteForm({ ownerUid, companyName, onSent }) {
  const [email,     setEmail]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied,    setCopied]    = useState(false);
  const [error,     setError]     = useState("");

  const handleSend = async () => {
    if (email && !email.includes("@")) { setError("Некорректный email"); return; }
    setSending(true); setError("");
    try {
      const ref = await addDoc(collection(db, "invites"), {
        ownerUid,
        companyName,
        email:      email.trim().toLowerCase(),
        role:       "viewer",
        invitedBy:  ownerUid,
        status:     "pending",
        createdAt:  serverTimestamp(),
      });
      const link = `${window.location.origin}/invite/${ref.id}`;
      setInviteLink(link);
      setDone(true);
      setEmail("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (done) {
    return (
      <div>
        <div style={{ background: C.posBg, border: `1px solid #bbf7d0`, borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.pos, marginBottom: 4 }}>
            ✓ Приглашение создано!
          </div>
          <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 10 }}>
            Отправьте эту ссылку сотруднику. Он перейдёт, создаст аккаунт и автоматически подключится к {companyName}.
            После этого вы сможете открыть ему нужные права.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{
              flex: 1, fontSize: 12, padding: "8px 10px",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.inkMid,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {inviteLink}
            </div>
            <button onClick={copyLink} style={{
              fontFamily: "inherit", fontSize: 12, padding: "8px 14px",
              borderRadius: 6, border: `1px solid ${copied ? C.pos : C.accent}`,
              background: copied ? C.posBg : C.accentBg,
              color: copied ? C.pos : C.accent,
              cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500,
            }}>
              {copied ? "✓ Скопировано" : "Копировать"}
            </button>
          </div>
        </div>
        <button onClick={() => { setDone(false); setInviteLink(""); onSent?.(); }} style={{
          fontFamily: "inherit", fontSize: 13, padding: "8px 20px",
          borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.surface, color: C.inkMid, cursor: "pointer",
        }}>
          Создать ещё одно
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 16, lineHeight: 1.5 }}>
        Введите email сотрудника (необязательно) и нажмите «Создать ссылку».
        Сотрудник перейдёт по ссылке, зарегистрируется и автоматически подключится
        к <strong>{companyName}</strong> с минимальными правами.
        После этого вы сможете открыть нужные разделы.
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkLight, marginBottom: 6 }}>
        Email сотрудника (необязательно)
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: error ? 4 : 16 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="colleague@company.com"
          style={{
            flex: 1, fontFamily: "inherit", fontSize: 13, padding: "9px 12px",
            border: `1px solid ${error ? C.neg : C.borderMid}`, borderRadius: 6,
            background: C.surface, color: C.ink, outline: "none",
          }}
        />
        <button onClick={handleSend} disabled={sending} style={{
          fontFamily: "inherit", fontSize: 13, padding: "9px 20px",
          borderRadius: 6, border: "none", background: C.accent,
          color: "#fff", cursor: sending ? "default" : "pointer",
          opacity: sending ? 0.7 : 1, whiteSpace: "nowrap", fontWeight: 500,
        }}>
          {sending ? "…" : "Создать ссылку"}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: C.neg, marginBottom: 12 }}>{error}</div>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const uid      = auth.currentUser?.uid;
  const isMobile = useIsMobile();

  const [companyName, setCompanyName] = useState("");
  const [members,     setMembers]     = useState([]);
  const [invites,     setInvites]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("members");

  useEffect(() => {
    if (!uid) return;
    const tryLoad = async () => {
      try {
        const snap1 = await getDoc(doc(db, "users", uid, "settings", "company"));
        if (snap1.exists()) { setCompanyName(snap1.data().name || snap1.data().companyName || ""); return; }
        const snap2 = await getDocs(collection(db, "users", uid, "settings"));
        if (!snap2.empty) {
          const data = snap2.docs[0].data();
          setCompanyName(data.name || data.companyName || data.company || "");
        }
      } catch (e) { console.error(e); }
    };
    tryLoad();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "team"),
      (snap) => { setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "invites"), where("ownerUid", "==", uid), where("status", "==", "pending")),
      (snap) => setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [uid]);

  const removeMember = (id) => deleteDoc(doc(db, "users", uid, "team", id));
  const cancelInvite = (id) => deleteDoc(doc(db, "invites", id));

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: C.inkLight, fontSize: 13, fontFamily: "inherit" }}>Загрузка…</div>
  );

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 780, padding: isMobile ? "1rem" : "1.5rem 1rem",
      color: C.ink, background: C.surfaceAlt, minHeight: "100vh",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 600, letterSpacing: -0.3, margin: 0 }}>Команда</h1>
        <div style={{ fontSize: 13, color: C.inkLight, marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
          {companyName && <span>{companyName} ·</span>}
          <span>{members.length} сотрудников</span>
          {invites.length > 0 && (
            <span style={{ padding: "1px 8px", borderRadius: 4, background: C.warnBg, color: C.warn, fontSize: 11, border: `1px solid ${C.warn}40` }}>
              {invites.length} ожидают
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4 }}>
        {[["members", `Сотрудники (${members.length})`], ["invite", "➕ Пригласить"]].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, fontFamily: "inherit", fontSize: 13, padding: "7px 0",
            borderRadius: 6, border: "none",
            background: tab === key ? C.accent : "transparent",
            color: tab === key ? "#fff" : C.inkMid,
            cursor: "pointer", fontWeight: tab === key ? 500 : 400,
            transition: "all 0.15s",
          }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div>
          {invites.length > 0 && (
            <div style={{ background: C.warnBg, border: `1px solid ${C.warn}40`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: C.warn, borderBottom: `1px solid ${C.warn}30` }}>
                ⏳ Ожидают принятия
              </div>
              {invites.map((inv) => (
                <InviteRow key={inv.id} invite={inv} onCancel={() => cancelInvite(inv.id)} />
              ))}
            </div>
          )}

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Участники</span>
              <button onClick={() => setTab("invite")} style={{ fontFamily: "inherit", fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", cursor: "pointer" }}>
                + Пригласить
              </button>
            </div>
            {members.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 4 }}>Пока нет сотрудников</div>
                <div style={{ fontSize: 13, color: C.inkLight, marginBottom: 16 }}>Пригласите коллег и настройте их доступ</div>
                <button onClick={() => setTab("invite")} style={{ fontFamily: "inherit", fontSize: 13, padding: "8px 20px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", cursor: "pointer" }}>
                  Пригласить первого
                </button>
              </div>
            ) : (
              <div style={{ padding: "12px" }}>
                {members.map((m) => <MemberCard key={m.id} member={m} ownerUid={uid} onRemove={removeMember} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite tab */}
      {tab === "invite" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 16 }}>Пригласить сотрудника</div>
          <InviteForm ownerUid={uid} companyName={companyName} onSent={() => setTab("members")} />
        </div>
      )}
    </div>
  );
}
