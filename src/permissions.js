// SKUPKA CRM — Система ролей и прав доступа
// v2.2.5

export const FULL_ACCESS_ROLES = ['admin', 'dir', 'zamdir', 'sysadmin'];
export const READ_ONLY_ROLES   = ['rev'];
export const RGM_ROLES         = ['rgmu', 'rgma'];
export const CITY_ROLES        = ['uralsk', 'atyray', 'aktobe'];

export const ALL_ROLES = [...FULL_ACCESS_ROLES, ...READ_ONLY_ROLES, ...RGM_ROLES, ...CITY_ROLES];

export const PAGES = ['board', 'dashboard', 'chat', 'tasks', 'kassa', 'zrs', 'attendance_spo', 'attendance_admin', 'tilda', 'archive', 'deleted'];

export const PAGE_LABELS = {
  board:            'Wazzup (Доска)',
  dashboard:        'Дашборд',
  chat:             'Чат',
  tasks:            'Задачи',
  kassa:            'Касса',
  zrs:              'ЗРС',
  attendance_spo:   'Смена СПО',
  attendance_admin: 'Смена Адм',
  tilda:            'Tilda',
  archive:          'Архив',
  deleted:          'Удалённые',
};

export function isFullAccess(role) { return FULL_ACCESS_ROLES.includes(role); }
export function isReadOnly(role)   { return READ_ONLY_ROLES.includes(role); }
export function isRgm(role)        { return RGM_ROLES.includes(role); }
export function isCityRole(role)   { return CITY_ROLES.includes(role); }

const FULL = { can_view: true, can_create: true, can_edit: true, can_delete: true };
const VIEW = { can_view: true, can_create: false, can_edit: false, can_delete: false };
const OWN  = { can_view: true, can_create: true, can_edit: true, can_delete: false };
const NONE = { can_view: false, can_create: false, can_edit: false, can_delete: false };

export function getDefaultPermissions(role) {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return Object.fromEntries(PAGES.map(p => [p, { ...FULL }]));
  }
  if (READ_ONLY_ROLES.includes(role)) {
    return Object.fromEntries(PAGES.map(p => [p, p === 'deleted' ? { ...NONE } : { ...VIEW }]));
  }
  if (RGM_ROLES.includes(role)) {
    return {
      board:            { ...OWN },
      dashboard:        { ...VIEW },
      chat:             { ...OWN },
      tasks:            { ...OWN },
      kassa:            { ...OWN },
      zrs:              { ...VIEW },
      attendance_spo:   { ...OWN },
      attendance_admin: { ...VIEW },
      tilda:            { ...VIEW },
      archive:          { ...VIEW },
      deleted:          { ...NONE },
    };
  }
  // city roles
  return {
    board:            { ...OWN },
    dashboard:        { ...NONE },
    chat:             { can_view:true, can_create:true, can_edit:false, can_delete:false },
    tasks:            { ...OWN },
    kassa:            { can_view:true, can_create:true, can_edit:false, can_delete:false },
    zrs:              { ...NONE },
    attendance_spo:   { can_view:true, can_create:true, can_edit:false, can_delete:false },
    attendance_admin: { ...NONE },
    tilda:            { ...VIEW },
    archive:          { ...VIEW },
    deleted:          { ...NONE },
  };
}

// Инициализация default прав в Supabase если таблица пустая
export async function initPermissions(supabase, users) {
  const { count } = await supabase.from('user_permissions').select('id', { count: 'exact', head: true });
  if (count > 0) return;
  const rows = [];
  for (const [username, u] of Object.entries(users)) {
    const perms = getDefaultPermissions(u.role);
    for (const [page, p] of Object.entries(perms)) {
      rows.push({ user_id: username, page, ...p, updated_by: 'system' });
    }
  }
  if (rows.length > 0) await supabase.from('user_permissions').insert(rows);
}

export async function loadPermissions(supabase, userId, role) {
  if (FULL_ACCESS_ROLES.includes(role)) return getDefaultPermissions(role);
  try {
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', userId);
    if (data && data.length > 0) {
      return Object.fromEntries(data.map(r => [r.page, { can_view: r.can_view, can_create: r.can_create, can_edit: r.can_edit, can_delete: r.can_delete }]));
    }
  } catch {}
  return getDefaultPermissions(role);
}

export async function loadUserCities(supabase, userId, defaultCities) {
  try {
    const { data } = await supabase.from('user_cities').select('city').eq('user_id', userId);
    if (data && data.length > 0) return data.map(r => r.city);
  } catch {}
  return defaultCities;
}

export async function loadUserSpecial(supabase, userId) {
  try {
    const { data } = await supabase.from('user_special').select('*').eq('user_id', userId).single();
    return data || { is_tovarovyed: false };
  } catch {
    return { is_tovarovyed: false };
  }
}
