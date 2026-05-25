// SKUPKA CRM — Пользователи системы
// Пароли хранятся в файле — не публикуй этот файл!
// Роли: admin, dir, zamdir, sysadmin, rev, rgmu, rgma, uralsk, atyray, aktobe
// Роли v2.4.0: okk, ovn, smm, dev (назначаются dir/admin, прописываются вручную)

export const USERS = {
  maksatovs: {
    password: 'Syrym10599!',
    role: 'dir',
    name: 'Максатов Сырым',
    position: 'Директор',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
  koshab: {
    password: 'Begdos10102!',
    role: 'zamdir',
    name: 'Кожа Бегдос',
    position: 'Зам. Директора',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
  kylyshbaenam: {
    password: 'Makpal10321!',
    role: 'sysadmin',
    name: 'Кылышбаева Макпал',
    position: 'Системный Администратор',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
  aleksandrovd: {
    password: 'Daniil99876!',
    role: 'rgmu',
    name: 'Александров Даниил',
    position: 'РГМ г. Уральск',
    cities: ['Уральск'],
  },
  k162: {
    password: 'Kyrman1621!',
    role: 'uralsk',
    name: 'Филиал к162',
    position: 'СПО г. Уральск',
    cities: ['Уральск'],
  },
  sv47: {
    password: 'Sever7055!',
    role: 'uralsk',
    name: 'Филиал св47',
    position: 'СПО г. Уральск',
    cities: ['Уральск'],
  },
  s32: {
    password: 'Satpaeva1010!',
    role: 'atyray',
    name: 'Филиал с32',
    position: 'СПО г. Атырау',
    cities: ['Атырау'],
  },
  a21: {
    password: 'Abyl60333!',
    role: 'aktobe',
    name: 'Филиал a21',
    position: 'СПО г. Актобе',
    cities: ['Актобе'],
  },
  aminovn: {
    password: 'Nyrlan10102!',
    role: 'rgma',
    name: 'Аминов Нурлан',
    position: 'РГМ г. Атырау',
    cities: ['Атырау'],
  },
  revizor: {
    password: 'Revizor2026skupka!',
    role: 'rev',
    name: 'СТ Ревизор',
    position: 'Ревизор Компании',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
  zmsgrove: {
    password: 'Marakoda8585!',
    role: 'admin',
    name: 'Админ',
    position: 'Администратор',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
};

export function login(username, password) {
  const user = USERS[username.toLowerCase()];
  if (!user) return null;
  if (user.password !== password) return null;
  if (user.role === 'disabled') return null;
  return { username, ...user };
}

export function getSession() {
  const raw = sessionStorage.getItem('skupka_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveSession(user) {
  sessionStorage.setItem('skupka_user', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('skupka_user');
}
