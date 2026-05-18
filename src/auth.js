// Пользователи системы SKUPKA CRM
export const USERS = {
  admin: {
    password: 'Qwerty662026',
    role: 'admin',
    name: 'Администратор',
    cities: ['Атырау', 'Актобе', 'Уральск'],
  },
  oral: {
    password: 'Oral1234',
    role: 'city',
    name: 'Уральск',
    cities: ['Уральск'],
  },
  aktobe: {
    password: 'Aktobe4444',
    role: 'city',
    name: 'Актобе',
    cities: ['Актобе'],
  },
  atytay: {
    password: 'Atyray1111',
    role: 'city',
    name: 'Атырау',
    cities: ['Атырау'],
  },
};

export function login(username, password) {
  const user = USERS[username.toLowerCase()];
  if (!user) return null;
  if (user.password !== password) return null;
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
