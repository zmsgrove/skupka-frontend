import React, { useState, useEffect } from 'react';
import { USERS } from '../auth';
import { supabase } from '../supabase';

const EDIT_ROLES = ['admin', 'dir', 'dev'];

const DEPARTMENTS = ['Руководство', 'Разработка', 'Продажи', 'Товароведение', 'ОКК', 'Маркетинг', 'ОВН'];

const ROLE_LABELS = {
  admin: 'Администратор', dir: 'Директор', zamdir: 'Зам. Директора',
  sysadmin: 'Сис. Администратор', rev: 'Ревизор', rgmu: 'РГМ Уральск',
  rgma: 'РГМ Атырау', uralsk: 'СПО Уральск', atyray: 'СПО Атырау',
  aktobe: 'СПО Актобе', okk: 'ОКК', ovn: 'ОВН', smm: 'Маркетинг', dev: 'Разработчик',
};

const ROLE_COLORS = {
  admin: '#E8263A', dir: '#8b5cf6', zamdir: '#06b6d4', sysadmin: '#10b981',
  rev: '#f59e0b', rgmu: '#a78bfa', rgma: '#f97316', uralsk: '#3b82f6',
  atyray: '#22c55e', aktobe: '#ec4899', okk: '#06b6d4', ovn: '#8b5cf6',
  smm: '#f0b429', dev: '#10b981',
};

export default function EmployeesPage({ user, theme }) {
  const t = theme;
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canEdit = EDIT_ROLES.includes(user.role);
  const employees = Object.entries(USERS).map(([id, u]) => ({ id, ...u }));

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    const { data } = await supabase.from('user_special').select('*');
    if (data) setProfiles(Object.fromEntries(data.map(r => [r.user_id, r])));
    setLoading(false);
  }

  const startEdit = (empId) => {
    const p = profiles[empId] || {};
    setEditForm({
      phone: p.phone || '',
      address: p.address || '',
      birthday: p.birthday || '',
      start_date: p.start_date || '',
      departments: p.departments || [],
    });
    setEditId(empId);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('user_special').upsert({
      user_id: editId,
      phone: editForm.phone || null,
      address: editForm.address || null,
      birthday: editForm.birthday || null,
      start_date: editForm.start_date || null,
      departments: editForm.departments,
    }, { onConflict: 'user_id' });
    if (!error) {
      setProfiles(prev => ({ ...prev, [editId]: { ...prev[editId], ...editForm, user_id: editId } }));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditId(null); }, 1200);
    }
    setSaving(false);
  };

  const toggleDept = (dept) => {
    setEditForm(prev => ({
      ...prev,
      departments: prev.departments.includes(dept) ? prev.departments.filter(d => d !== dept) : [...prev.departments, dept],
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try { return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return dateStr; }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.text2 }}>Загрузка...</div>;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 0 40px' }}>
      <div style={{ padding: '18px 24px 16px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 17, fontWeight: 700, color: t.text }}>👥 Сотрудники</div>
        <div style={{ color: t.text2, fontSize: 12, marginTop: 2 }}>Справочник команды SKUPKA · {employees.length} сотрудников</div>
      </div>

      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {employees.map(emp => {
          const p = profiles[emp.id] || {};
          const roleColor = ROLE_COLORS[emp.role] || '#8b5cf6';
          const isEditing = editId === emp.id;

          return (
            <div key={emp.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(10px)', transition: 'border-color 0.15s' }}>
              {/* Card header */}
              <div style={{ padding: '18px 18px 14px', display: 'flex', gap: 14, alignItems: 'flex-start', borderBottom: `1px solid ${t.border}22` }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: roleColor + '20', border: `2px solid ${roleColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: roleColor, flexShrink: 0 }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                  <div style={{ color: t.text2, fontSize: 12, marginTop: 2 }}>{emp.position}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: roleColor + '18', color: roleColor, border: `1px solid ${roleColor}33`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: 'Unbounded,sans-serif' }}>
                      {ROLE_LABELS[emp.role] || emp.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 18px' }}>
                {/* Departments */}
                {p.departments && p.departments.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {p.departments.map(d => (
                      <span key={d} style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text2, fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>{d}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {p.phone && <InfoRow icon="📞" value={p.phone} t={t} />}
                  {p.address && <InfoRow icon="🏠" value={p.address} t={t} />}
                  {emp.cities && <InfoRow icon="🏙️" value={emp.cities.join(', ')} t={t} />}
                  {p.birthday && <InfoRow icon="🎂" value={formatDate(p.birthday)} t={t} />}
                  {p.start_date && <InfoRow icon="📅" value={`С ${formatDate(p.start_date)}`} t={t} />}
                  {!p.phone && !p.address && !p.birthday && !p.start_date && (
                    <div style={{ color: t.text2, fontSize: 12, fontStyle: 'italic' }}>Профиль не заполнен</div>
                  )}
                </div>

                {canEdit && !isEditing && (
                  <button onClick={() => startEdit(emp.id)} style={{ marginTop: 12, width: '100%', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '6px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    ✏️ Редактировать
                  </button>
                )}
              </div>

              {/* Edit form */}
              {isEditing && (
                <div style={{ padding: '14px 18px', borderTop: `1px solid ${t.border}`, background: t.surface2 + '66' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Телефон" style={inputStyle(t)} />
                    <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Адрес" style={inputStyle(t)} />
                    <div>
                      <div style={{ color: t.text2, fontSize: 11, marginBottom: 4 }}>Дата рождения</div>
                      <input type="date" value={editForm.birthday} onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))} style={inputStyle(t)} />
                    </div>
                    <div>
                      <div style={{ color: t.text2, fontSize: 11, marginBottom: 4 }}>Дата начала работы</div>
                      <input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle(t)} />
                    </div>
                    <div>
                      <div style={{ color: t.text2, fontSize: 11, marginBottom: 6 }}>Отделы</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {DEPARTMENTS.map(d => {
                          const sel = editForm.departments.includes(d);
                          return (
                            <button key={d} onClick={() => toggleDept(d)} style={{ background: sel ? 'rgba(232,38,58,0.12)' : 'transparent', border: `1px solid ${sel ? 'rgba(232,38,58,0.4)' : t.border}`, borderRadius: 20, color: sel ? '#E8263A' : t.text2, fontSize: 11, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>{d}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '7px', cursor: 'pointer' }}>Отмена</button>
                      <button onClick={saveProfile} disabled={saving} style={{ flex: 2, background: saving ? t.surface2 : '#E8263A', border: 'none', borderRadius: 8, color: saving ? t.text2 : '#fff', fontSize: 12, fontWeight: 700, padding: '7px', cursor: saving ? 'default' : 'pointer' }}>
                        {saved ? '✅ Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ icon, value, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ color: t.text2, fontSize: 12 }}>{value}</span>
    </div>
  );
}

function inputStyle(t) {
  return {
    width: '100%', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8,
    color: t.text, fontSize: 12, padding: '7px 10px', fontFamily: 'Inter,sans-serif',
    outline: 'none', boxSizing: 'border-box',
  };
}
