import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Department } from '../types';
import { Plus, Edit2, UserX, UserCheck } from 'lucide-react';

export default function UsersPage() {
  const { t, experienceLevelLabels } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', nameTh: '', role: 'NURSE', departmentId: '', experienceLevel: 'LEVEL_1' });

  useEffect(() => {
    loadUsers();
    api.get('/departments').then(r => setDepartments(r.data));
  }, []);

  const loadUsers = () => api.get('/users').then(r => setUsers(r.data));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, form);
      } else {
        await api.post('/users', form);
      }
      loadUsers();
      setShowModal(false);
      setEditing(null);
      setForm({ email: '', password: '', name: '', nameTh: '', role: 'NURSE', departmentId: '', experienceLevel: 'LEVEL_1' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, password: '', name: u.name, nameTh: u.nameTh || '', role: u.role, departmentId: u.departmentId || '', experienceLevel: u.experienceLevel });
    setShowModal(true);
  };

  const toggleActive = async (u: User) => {
    if (u.active) {
      await api.delete(`/users/${u.id}`);
    } else {
      await api.patch(`/users/${u.id}`, { active: true });
    }
    loadUsers();
  };

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-surface-900">{t.users}</h2>
        <button onClick={() => { setEditing(null); setForm({ email: '', password: '', name: '', nameTh: '', role: 'NURSE', departmentId: '', experienceLevel: 'LEVEL_1' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t.create}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-2">ชื่อ</th>
              <th className="py-3 px-2">{t.email}</th>
              <th className="py-3 px-2">บทบาท</th>
              <th className="py-3 px-2">{t.department}</th>
              <th className="py-3 px-2">{t.experienceLevel}</th>
              <th className="py-3 px-2">สถานะ</th>
              <th className="py-3 px-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-surface-100">
                <td className="py-3 px-2">
                  <div>{u.nameTh || u.name}</div>
                  {u.nameTh && <div className="text-xs text-surface-400">{u.name}</div>}
                </td>
                <td className="py-3 px-2 text-surface-600">{u.email}</td>
                <td className="py-3 px-2">
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'REVIEWER' ? 'badge-info' : 'badge-success'}`}>
                    {u.role === 'ADMIN' ? t.admin : u.role === 'REVIEWER' ? t.reviewer : t.nurse}
                  </span>
                </td>
                <td className="py-3 px-2">{u.department?.nameTh || '-'}</td>
                <td className="py-3 px-2 text-xs">{experienceLevelLabels[u.experienceLevel]}</td>
                <td className="py-3 px-2">
                  <span className={`badge ${u.active ? 'badge-success' : 'badge-gray'}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="p-1 hover:bg-surface-200 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(u)} className="p-1 hover:bg-surface-200 rounded">
                      {u.active ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editing ? t.edit : t.create} ผู้ใช้</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">ชื่อ (English)</label>
                <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label className="label">ชื่อ (ภาษาไทย)</label>
                <input className="input-field" value={form.nameTh} onChange={e => setForm({...form, nameTh: e.target.value})} />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="label">{t.email}</label>
                    <input className="input-field" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">{t.password}</label>
                    <input className="input-field" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                  </div>
                </>
              )}
              {editing && (
                <div>
                  <label className="label">{t.password} (เว้นว่างถ้าไม่เปลี่ยน)</label>
                  <input className="input-field" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
              )}
              <div>
                <label className="label">บทบาท</label>
                <select className="input-field" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="NURSE">{t.nurse}</option>
                  <option value="REVIEWER">{t.reviewer}</option>
                  <option value="ADMIN">{t.admin}</option>
                </select>
              </div>
              <div>
                <label className="label">{t.department}</label>
                <select className="input-field" value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
                  <option value="">-- ไม่ระบุ --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.nameTh}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.experienceLevel}</label>
                <select className="input-field" value={form.experienceLevel} onChange={e => setForm({...form, experienceLevel: e.target.value})}>
                  {Object.entries(experienceLevelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{t.save}</button>
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary flex-1">{t.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
