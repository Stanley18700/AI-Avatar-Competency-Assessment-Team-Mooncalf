import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

interface Department {
  id: string;
  nameEn: string;
  nameTh: string;
  code: string;
  _count?: { users: number; cases: number };
}

export default function DepartmentsPage() {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ nameEn: '', nameTh: '', code: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/departments');
    setDepartments(data);
  };

  const openCreate = () => { setEditing(null); setForm({ nameEn: '', nameTh: '', code: '' }); setModal(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ nameEn: d.nameEn, nameTh: d.nameTh, code: d.code }); setModal(true); };

  const save = async () => {
    try {
      if (editing) {
        await api.patch(`/departments/${editing.id}`, form);
      } else {
        await api.post('/departments', form);
      }
      setModal(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('ลบแผนกนี้?')) return;
    try {
      await api.delete(`/departments/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t.departments}</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {t.create}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d.id} className="card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{d.nameTh}</h3>
                <p className="text-sm text-gray-500">{d.nameEn}</p>
                <p className="text-xs text-gray-400">รหัส: {d.code}</p>
                {d._count && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>{d._count.users} พยาบาล</span>
                    <span>{d._count.cases} เคส</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
                <button onClick={() => remove(d.id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editing ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อภาษาไทย</label>
                <input className="input-field" value={form.nameTh} onChange={e => setForm({ ...form, nameTh: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">ชื่อภาษาอังกฤษ</label>
                <input className="input-field" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">รหัส</label>
                <input className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(false)} className="btn-secondary">ยกเลิก</button>
              <button onClick={save} className="btn-primary">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
