import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 0 }).format(n ?? 0);

const STATUS = {
  active: { label: "Активен", color: "#16a34a", bg: "#dcfce7" },
  low: { label: "Мало", color: "#d97706", bg: "#fef3c7" },
  out: { label: "Нет", color: "#dc2626", bg: "#fee2e2" },
};

const getStatus = (qty, min) => {
  if (qty <= 0) return "out";
  if (qty <= min) return "low";
  return "active";
};

const CATEGORIES = ["Все", "Сырьё", "Готовая продукция", "Упаковка", "Запчасти", "Прочее"];

const MOVEMENT_TYPES = {
  in: { label: "Приход", color: "#16a34a" },
  out: { label: "Расход", color: "#dc2626" },
  transfer: { label: "Перемещение", color: "#2563eb" },
  adjustment: { label: "Корректировка", color: "#7c3aed" },
};

// ─── styles ─────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .wh-root {
    font-family: 'Sora', sans-serif;
    background: #f8f7f4;
    min-height: 100vh;
    color: #1a1a18;
  }

  .wh-header {
    background: #1a1a18;
    padding: 20px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .wh-logo {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f8f7f4;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .wh-logo-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #f0b429;
  }

  .wh-header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .wh-body {
    padding: 32px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .wh-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }

  .wh-kpi {
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 12px;
    padding: 20px 24px;
    position: relative;
    overflow: hidden;
  }

  .wh-kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent, #f0b429);
  }

  .wh-kpi-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 10px;
  }

  .wh-kpi-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 500;
    color: #1a1a18;
    line-height: 1;
  }

  .wh-kpi-sub {
    font-size: 12px;
    color: #999;
    margin-top: 6px;
  }

  .wh-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
  }

  .wh-search {
    flex: 1;
    min-width: 200px;
    padding: 10px 16px;
    border: 1px solid #e8e6e1;
    border-radius: 8px;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    background: #fff;
    outline: none;
    transition: border-color 0.2s;
  }

  .wh-search:focus { border-color: #1a1a18; }

  .wh-filter-tabs {
    display: flex;
    gap: 4px;
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 8px;
    padding: 4px;
  }

  .wh-tab {
    padding: 6px 12px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    color: #888;
    font-family: 'Sora', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .wh-tab.active {
    background: #1a1a18;
    color: #fff;
  }

  .wh-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .wh-btn-primary {
    background: #f0b429;
    color: #1a1a18;
  }

  .wh-btn-primary:hover { background: #e6a820; }

  .wh-btn-secondary {
    background: #fff;
    color: #1a1a18;
    border: 1px solid #e8e6e1;
  }

  .wh-btn-secondary:hover { background: #f8f7f4; }

  .wh-btn-danger {
    background: #fee2e2;
    color: #dc2626;
  }

  .wh-btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 6px;
  }

  .wh-view-toggle {
    display: flex;
    gap: 4px;
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 8px;
    padding: 4px;
  }

  .wh-view-btn {
    width: 32px; height: 32px;
    border-radius: 5px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 16px;
    transition: all 0.15s;
  }

  .wh-view-btn.active {
    background: #1a1a18;
    color: #fff;
  }

  /* Table */
  .wh-table-wrap {
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 12px;
    overflow: hidden;
  }

  .wh-table {
    width: 100%;
    border-collapse: collapse;
  }

  .wh-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #888;
    padding: 14px 16px;
    border-bottom: 1px solid #e8e6e1;
    background: #fafaf8;
    white-space: nowrap;
  }

  .wh-table td {
    padding: 14px 16px;
    font-size: 14px;
    border-bottom: 1px solid #f0ede8;
    vertical-align: middle;
  }

  .wh-table tr:last-child td { border-bottom: none; }

  .wh-table tr:hover td { background: #fafaf8; }

  .wh-sku {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #999;
  }

  .wh-product-name {
    font-weight: 500;
    color: #1a1a18;
  }

  .wh-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .wh-qty {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 500;
  }

  .wh-qty-bar-wrap {
    width: 80px;
    height: 4px;
    background: #f0ede8;
    border-radius: 2px;
    margin-top: 4px;
  }

  .wh-qty-bar {
    height: 4px;
    border-radius: 2px;
    background: var(--bar-color, #16a34a);
    transition: width 0.3s;
  }

  /* Grid view */
  .wh-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .wh-card {
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .wh-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.07);
  }

  .wh-card-sku {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #bbb;
    margin-bottom: 8px;
  }

  .wh-card-name {
    font-weight: 600;
    font-size: 15px;
    color: #1a1a18;
    margin-bottom: 4px;
  }

  .wh-card-cat {
    font-size: 12px;
    color: #999;
    margin-bottom: 16px;
  }

  .wh-card-qty {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 600;
    line-height: 1;
    color: #1a1a18;
  }

  .wh-card-unit {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }

  .wh-card-stripe {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
  }

  /* Modal */
  .wh-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26,26,24,0.5);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .wh-modal {
    background: #fff;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .wh-modal-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a18;
    margin-bottom: 24px;
  }

  .wh-field {
    margin-bottom: 16px;
  }

  .wh-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #888;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .wh-input, .wh-select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e8e6e1;
    border-radius: 8px;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    color: #1a1a18;
    background: #fafaf8;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .wh-input:focus, .wh-select:focus { border-color: #1a1a18; background: #fff; }

  .wh-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .wh-modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f0ede8;
  }

  /* Movement modal */
  .wh-move-types {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 20px;
  }

  .wh-move-type-btn {
    padding: 10px 8px;
    border-radius: 8px;
    border: 2px solid #e8e6e1;
    background: #fff;
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #888;
    transition: all 0.15s;
    text-align: center;
  }

  .wh-move-type-btn.active {
    border-color: var(--move-color);
    background: var(--move-bg);
    color: var(--move-color);
  }

  .wh-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1a1a18;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Movement log */
  .wh-log {
    margin-top: 28px;
    background: #fff;
    border: 1px solid #e8e6e1;
    border-radius: 12px;
    overflow: hidden;
  }

  .wh-log-header {
    padding: 16px 20px;
    border-bottom: 1px solid #f0ede8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .wh-log-item {
    display: grid;
    grid-template-columns: 140px 1fr 80px 80px 120px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #f8f7f4;
    font-size: 13px;
    gap: 12px;
  }

  .wh-log-item:last-child { border-bottom: none; }
  .wh-log-item:hover { background: #fafaf8; }

  .wh-log-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #bbb;
  }

  .wh-empty {
    text-align: center;
    padding: 60px 20px;
    color: #bbb;
  }

  .wh-empty-icon { font-size: 48px; margin-bottom: 12px; }
  .wh-empty-text { font-size: 14px; }

  .wh-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #bbb;
    font-size: 14px;
    gap: 10px;
  }

  @media (max-width: 768px) {
    .wh-body { padding: 16px; }
    .wh-kpis { grid-template-columns: repeat(2, 1fr); }
    .wh-log-item { grid-template-columns: 1fr 1fr; }
    .wh-row { grid-template-columns: 1fr; }
  }
`;

// ─── Main component ──────────────────────────────────────────────────────────
export default function Warehouse() {
  const uid = auth.currentUser?.uid;

  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("table"); // table | grid
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [activeTab, setActiveTab] = useState("products"); // products | movements

  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    name: "", sku: "", category: "Прочее", unit: "шт",
    quantity: 0, minQuantity: 0, price: 0, location: "",
  });

  const [movementForm, setMovementForm] = useState({
    type: "in", productId: "", quantity: 0, comment: "", date: new Date().toISOString().slice(0, 10),
  });

  // ── Firestore ──
  useEffect(() => { if (uid) { fetchProducts(); fetchMovements(); } }, [uid]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const q = query(collection(db, "warehouse_products"), where("uid", "==", uid), orderBy("name"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function fetchMovements() {
    try {
      const q = query(collection(db, "warehouse_movements"), where("uid", "==", uid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  }

  async function saveProduct() {
    const data = { ...productForm, uid, quantity: +productForm.quantity, minQuantity: +productForm.minQuantity, price: +productForm.price, updatedAt: serverTimestamp() };
    if (editingProduct) {
      await updateDoc(doc(db, "warehouse_products", editingProduct.id), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "warehouse_products"), data);
    }
    closeProductModal();
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm("Удалить товар?")) return;
    await deleteDoc(doc(db, "warehouse_products", id));
    fetchProducts();
  }

  async function saveMovement() {
    const product = products.find((p) => p.id === movementForm.productId);
    if (!product) return;

    const qty = +movementForm.quantity;
    let delta = movementForm.type === "in" ? qty : movementForm.type === "out" ? -qty : movementForm.type === "adjustment" ? qty - product.quantity : 0;

    await addDoc(collection(db, "warehouse_movements"), {
      ...movementForm,
      uid,
      quantity: qty,
      productName: product.name,
      productSku: product.sku,
      balanceBefore: product.quantity,
      balanceAfter: product.quantity + delta,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "warehouse_products", product.id), {
      quantity: product.quantity + delta,
      updatedAt: serverTimestamp(),
    });

    setShowMovementModal(false);
    setMovementForm({ type: "in", productId: "", quantity: 0, comment: "", date: new Date().toISOString().slice(0, 10) });
    fetchProducts();
    fetchMovements();
  }

  function openProductModal(product = null) {
    if (product) {
      setEditingProduct(product);
      setProductForm({ name: product.name, sku: product.sku, category: product.category, unit: product.unit, quantity: product.quantity, minQuantity: product.minQuantity, price: product.price || 0, location: product.location || "" });
    } else {
      setEditingProduct(null);
      setProductForm({ name: "", sku: "", category: "Прочее", unit: "шт", quantity: 0, minQuantity: 0, price: 0, location: "" });
    }
    setShowProductModal(true);
  }

  function closeProductModal() {
    setShowProductModal(false);
    setEditingProduct(null);
  }

  // ── Derived ──
  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Все" || p.category === category;
    return matchSearch && matchCat;
  });

  const totalItems = products.length;
  const totalQty = products.reduce((s, p) => s + (p.quantity || 0), 0);
  const lowStock = products.filter((p) => getStatus(p.quantity, p.minQuantity) === "low").length;
  const outStock = products.filter((p) => getStatus(p.quantity, p.minQuantity) === "out").length;
  const totalValue = products.reduce((s, p) => s + (p.quantity || 0) * (p.price || 0), 0);

  const maxQty = Math.max(...products.map((p) => p.quantity || 0), 1);

  return (
    <>
      <style>{css}</style>
      <div className="wh-root">
        {/* Header */}
        <header className="wh-header">
          <div className="wh-logo">
            <div className="wh-logo-dot" />
            Склад
          </div>
          <div className="wh-header-actions">
            <button className="wh-btn wh-btn-secondary" style={{ color: "#f8f7f4", borderColor: "#444", background: "#2a2a28" }} onClick={() => setShowMovementModal(true)}>
              ↕ Движение
            </button>
            <button className="wh-btn wh-btn-primary" onClick={() => openProductModal()}>
              + Добавить товар
            </button>
          </div>
        </header>

        <div className="wh-body">
          {/* KPIs */}
          <div className="wh-kpis">
            <div className="wh-kpi" style={{ "--accent": "#f0b429" }}>
              <div className="wh-kpi-label">Всего позиций</div>
              <div className="wh-kpi-value">{totalItems}</div>
              <div className="wh-kpi-sub">наименований</div>
            </div>
            <div className="wh-kpi" style={{ "--accent": "#2563eb" }}>
              <div className="wh-kpi-label">Общий остаток</div>
              <div className="wh-kpi-value">{fmt(totalQty)}</div>
              <div className="wh-kpi-sub">единиц на складе</div>
            </div>
            <div className="wh-kpi" style={{ "--accent": totalValue > 0 ? "#16a34a" : "#e8e6e1" }}>
              <div className="wh-kpi-label">Стоимость склада</div>
              <div className="wh-kpi-value">{fmt(totalValue)}</div>
              <div className="wh-kpi-sub">сум (по закупочной)</div>
            </div>
            <div className="wh-kpi" style={{ "--accent": outStock > 0 ? "#dc2626" : lowStock > 0 ? "#d97706" : "#16a34a" }}>
              <div className="wh-kpi-label">Требуют внимания</div>
              <div className="wh-kpi-value">{lowStock + outStock}</div>
              <div className="wh-kpi-sub">{outStock} нет · {lowStock} мало</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="wh-filter-tabs" style={{ marginBottom: 20, width: "fit-content" }}>
            {["products", "movements"].map((t) => (
              <button key={t} className={`wh-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t === "products" ? "Товары" : "Движение товаров"}
              </button>
            ))}
          </div>

          {activeTab === "products" && (
            <>
              {/* Toolbar */}
              <div className="wh-toolbar">
                <input className="wh-search" placeholder="Поиск по названию или артикулу..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="wh-filter-tabs">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} className={`wh-tab ${category === cat ? "active" : ""}`} onClick={() => setCategory(cat)}>{cat}</button>
                  ))}
                </div>
                <div className="wh-view-toggle">
                  <button className={`wh-view-btn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Таблица">☰</button>
                  <button className={`wh-view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} title="Карточки">⊞</button>
                </div>
              </div>

              {loading ? (
                <div className="wh-loading">⏳ Загрузка...</div>
              ) : filtered.length === 0 ? (
                <div className="wh-empty">
                  <div className="wh-empty-icon">📦</div>
                  <div className="wh-empty-text">Нет товаров. Добавьте первый!</div>
                </div>
              ) : view === "table" ? (
                <div className="wh-table-wrap">
                  <table className="wh-table">
                    <thead>
                      <tr>
                        <th>Артикул</th>
                        <th>Наименование</th>
                        <th>Категория</th>
                        <th>Ед.</th>
                        <th>Остаток</th>
                        <th>Цена (сум)</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Место</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const st = getStatus(p.quantity, p.minQuantity);
                        const s = STATUS[st];
                        const barPct = Math.min(100, ((p.quantity || 0) / maxQty) * 100);
                        const barColor = st === "active" ? "#16a34a" : st === "low" ? "#d97706" : "#dc2626";
                        return (
                          <tr key={p.id}>
                            <td><span className="wh-sku">{p.sku || "—"}</span></td>
                            <td><span className="wh-product-name">{p.name}</span></td>
                            <td><span style={{ fontSize: 12, color: "#888" }}>{p.category}</span></td>
                            <td style={{ color: "#888", fontSize: 13 }}>{p.unit}</td>
                            <td>
                              <div className="wh-qty">{fmt(p.quantity)}</div>
                              <div className="wh-qty-bar-wrap"><div className="wh-qty-bar" style={{ width: barPct + "%", "--bar-color": barColor }} /></div>
                            </td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fmt(p.price)}</td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt((p.quantity || 0) * (p.price || 0))}</td>
                            <td><span className="wh-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span></td>
                            <td style={{ fontSize: 12, color: "#aaa" }}>{p.location || "—"}</td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="wh-btn wh-btn-secondary wh-btn-sm" onClick={() => openProductModal(p)}>✏️</button>
                                <button className="wh-btn wh-btn-danger wh-btn-sm" onClick={() => deleteProduct(p.id)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="wh-grid">
                  {filtered.map((p) => {
                    const st = getStatus(p.quantity, p.minQuantity);
                    const s = STATUS[st];
                    const stripeColor = st === "active" ? "#16a34a" : st === "low" ? "#d97706" : "#dc2626";
                    return (
                      <div key={p.id} className="wh-card">
                        <div className="wh-card-stripe" style={{ background: stripeColor }} />
                        <div className="wh-card-sku">{p.sku || "—"}</div>
                        <div className="wh-card-name">{p.name}</div>
                        <div className="wh-card-cat">{p.category}</div>
                        <div className="wh-card-qty">{fmt(p.quantity)}</div>
                        <div className="wh-card-unit">{p.unit}</div>
                        <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <span className="wh-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                          <button className="wh-btn wh-btn-secondary wh-btn-sm" style={{ flex: 1 }} onClick={() => openProductModal(p)}>Изменить</button>
                          <button className="wh-btn wh-btn-danger wh-btn-sm" onClick={() => deleteProduct(p.id)}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "movements" && (
            <div className="wh-log">
              <div className="wh-log-header">
                <span className="wh-section-title" style={{ margin: 0 }}>Журнал движений</span>
                <button className="wh-btn wh-btn-primary wh-btn-sm" onClick={() => setShowMovementModal(true)}>+ Новое движение</button>
              </div>
              {movements.length === 0 ? (
                <div className="wh-empty">
                  <div className="wh-empty-icon">📋</div>
                  <div className="wh-empty-text">Нет записей</div>
                </div>
              ) : (
                movements.map((m) => {
                  const mt = MOVEMENT_TYPES[m.type];
                  const sign = m.type === "in" ? "+" : m.type === "out" ? "−" : "~";
                  return (
                    <div key={m.id} className="wh-log-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.productName}</div>
                        <div className="wh-sku">{m.productSku}</div>
                      </div>
                      <div style={{ color: "#666", fontSize: 12 }}>{m.comment || "—"}</div>
                      <div>
                        <span className="wh-badge" style={{ background: mt?.color + "20", color: mt?.color }}>
                          {mt?.label}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: m.type === "in" ? "#16a34a" : m.type === "out" ? "#dc2626" : "#888" }}>
                        {sign}{fmt(m.quantity)}
                      </div>
                      <div className="wh-log-time">
                        {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString("ru-RU") : m.date}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Product Modal */}
        {showProductModal && (
          <div className="wh-overlay" onClick={(e) => e.target === e.currentTarget && closeProductModal()}>
            <div className="wh-modal">
              <div className="wh-modal-title">{editingProduct ? "Редактировать товар" : "Новый товар"}</div>
              <div className="wh-field">
                <label className="wh-label">Наименование *</label>
                <input className="wh-input" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Название товара" />
              </div>
              <div className="wh-row">
                <div className="wh-field">
                  <label className="wh-label">Артикул (SKU)</label>
                  <input className="wh-input" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="SKU-001" />
                </div>
                <div className="wh-field">
                  <label className="wh-label">Категория</label>
                  <select className="wh-select" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "Все").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="wh-row">
                <div className="wh-field">
                  <label className="wh-label">Количество</label>
                  <input className="wh-input" type="number" min="0" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} />
                </div>
                <div className="wh-field">
                  <label className="wh-label">Минимум (для уведомления)</label>
                  <input className="wh-input" type="number" min="0" value={productForm.minQuantity} onChange={(e) => setProductForm({ ...productForm, minQuantity: e.target.value })} />
                </div>
              </div>
              <div className="wh-row">
                <div className="wh-field">
                  <label className="wh-label">Единица измерения</label>
                  <select className="wh-select" value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                    {["шт", "кг", "л", "м", "м²", "упак", "рулон", "коробка"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="wh-field">
                  <label className="wh-label">Закупочная цена (сум)</label>
                  <input className="wh-input" type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                </div>
              </div>
              <div className="wh-field">
                <label className="wh-label">Место хранения</label>
                <input className="wh-input" value={productForm.location} onChange={(e) => setProductForm({ ...productForm, location: e.target.value })} placeholder="Стеллаж A-3, ячейка 12" />
              </div>
              <div className="wh-modal-footer">
                <button className="wh-btn wh-btn-secondary" onClick={closeProductModal}>Отмена</button>
                <button className="wh-btn wh-btn-primary" onClick={saveProduct} disabled={!productForm.name}>
                  {editingProduct ? "Сохранить" : "Добавить"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Movement Modal */}
        {showMovementModal && (
          <div className="wh-overlay" onClick={(e) => e.target === e.currentTarget && setShowMovementModal(false)}>
            <div className="wh-modal">
              <div className="wh-modal-title">Новое движение товара</div>
              <div className="wh-move-types">
                {Object.entries(MOVEMENT_TYPES).map(([key, val]) => (
                  <button key={key} className={`wh-move-type-btn ${movementForm.type === key ? "active" : ""}`}
                    style={{ "--move-color": val.color, "--move-bg": val.color + "18" }}
                    onClick={() => setMovementForm({ ...movementForm, type: key })}>
                    {val.label}
                  </button>
                ))}
              </div>
              <div className="wh-field">
                <label className="wh-label">Товар *</label>
                <select className="wh-select" value={movementForm.productId} onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}>
                  <option value="">— выберите товар —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (остаток: {p.quantity} {p.unit})</option>)}
                </select>
              </div>
              <div className="wh-row">
                <div className="wh-field">
                  <label className="wh-label">
                    {movementForm.type === "adjustment" ? "Новый остаток" : "Количество"}
                  </label>
                  <input className="wh-input" type="number" min="0" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} />
                </div>
                <div className="wh-field">
                  <label className="wh-label">Дата</label>
                  <input className="wh-input" type="date" value={movementForm.date} onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })} />
                </div>
              </div>
              <div className="wh-field">
                <label className="wh-label">Комментарий</label>
                <input className="wh-input" value={movementForm.comment} onChange={(e) => setMovementForm({ ...movementForm, comment: e.target.value })} placeholder="Поставщик, причина, номер накладной..." />
              </div>
              <div className="wh-modal-footer">
                <button className="wh-btn wh-btn-secondary" onClick={() => setShowMovementModal(false)}>Отмена</button>
                <button className="wh-btn wh-btn-primary" onClick={saveMovement} disabled={!movementForm.productId || !movementForm.quantity}>
                  Провести
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
