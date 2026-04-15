import { useState, useEffect } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [entities, setEntities] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const loadData = async () => {
    const projSnap = await getDocs(userCol("projects"));
    const entSnap  = await getDocs(userCol("legal_entities"));
    const accSnap  = await getDocs(userCol("accounts"));

    setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setEntities(entSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async (id, field, value) => {
    await updateDoc(userDoc("projects", id), { [field]: value });

    setProjects(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить проект?")) return;
    await deleteDoc(userDoc("projects", id));
    loadData();
  };

  const getEntities = (ids = []) => entities.filter(e => ids.includes(e.id));
  const getAccounts = (ids = []) => accounts.filter(a => ids.includes(a.id));

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">

      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">Проекты</h1>

        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white"
        >
          <Plus size={16} />
          Создать
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {projects.map((item) => {
          const projEntities = getEntities(item.entityIds);
          const projAccounts = getAccounts(item.accountIds);

          return (
            <div
              key={item.id}
              className="relative bg-white p-5 rounded-2xl shadow hover:shadow-xl transition"
            >

              <div className="absolute top-3 right-3">
                <button onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}>
                  <MoreVertical size={18} />
                </button>

                {menuOpen === item.id && (
                  <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg p-2 text-sm z-10">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                    >
                      Редактировать
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="block px-3 py-2 text-red-500 hover:bg-gray-100 w-full text-left"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>

              {editingId === item.id ? (
                <div className="space-y-2">
                  <input
                    value={item.name}
                    onChange={(e) => handleUpdate(item.id, "name", e.target.value)}
                    className="font-semibold text-lg w-full border rounded px-2"
                  />

                  <textarea
                    value={item.description || ""}
                    onChange={(e) => handleUpdate(item.id, "description", e.target.value)}
                    className="text-sm w-full border rounded px-2"
                  />

                  <button
                    onClick={() => setEditingId(null)}
                    className="text-blue-600 text-sm"
                  >
                    Готово
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-xs text-gray-400">
                    {item.description || "Без описания"}
                  </p>
                </>
              )}

              {projEntities.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs text-gray-400 mb-2">Юрлица</p>
                  {projEntities.map(e => (
                    <div key={e.id} className="text-sm bg-gray-50 px-3 py-2 rounded mb-1">
                      {e.name}
                    </div>
                  ))}
                </div>
              )}

              {projAccounts.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Счета</p>
                  {projAccounts.map(acc => (
                    <div
                      key={acc.id}
                      className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded mb-1"
                    >
                      <span>{acc.name}</span>
                      <span>{acc.balance} {acc.currency}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {openModal && (
        <CreateProjectModal
          entities={entities}
          accounts={accounts}
          onClose={() => setOpenModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onSuccess, entities, accounts }) {
  const [name, setName] = useState("");
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  const toggle = (list, setList, id) => {
    setList(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    await addDoc(userCol("projects"), {
      name,
      entityIds: selectedEntities,
      accountIds: selectedAccounts,
      createdAt: new Date(),
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

      <div className="bg-white p-6 rounded-xl w-[500px]">

        <h2 className="mb-4 font-bold">Создать проект</h2>

        <input
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 mb-4"
        />

        <div className="mb-4">
          <p className="text-sm mb-2">Юрлица</p>
          {entities.map(e => (
            <label key={e.id} className="block text-sm">
              <input
                type="checkbox"
                onChange={() => toggle(selectedEntities, setSelectedEntities, e.id)}
              /> {e.name}
            </label>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-sm mb-2">Счета</p>
          {accounts.map(a => (
            <label key={a.id} className="block text-sm">
              <input
                type="checkbox"
                onChange={() => toggle(selectedAccounts, setSelectedAccounts, a.id)}
              /> {a.name}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Отмена</button>

          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}