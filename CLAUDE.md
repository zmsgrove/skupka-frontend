# SKUPKA CRM — Контекст проекта

## Стек
- React фронтенд (эта папка)
- Node.js бэкенд (папка skupka-backend рядом)
- Supabase — БД + Realtime
- Render — хостинг
- Wazzup — WhatsApp интеграция
- GitHub: zmsgrove/skupka-frontend и zmsgrove/skupka-backend

## Текущая версия: 2.2.7

## Дорожная карта
- ✅ 2.0.1–2.0.7 — фиксы и улучшения
- ✅ 2.1.0 — Фибоначчи, glassmorphism, редизайн, 10 тем сохранены
- ✅ 2.1.1 — drag&drop, ПКМ, логика удаления, changelog
- ✅ 2.2.0 — CRM ассистент базовый
- ✅ 2.2.1 — фиксы ассистента, web search
- ✅ 2.2.2 — системный промпт, скорость, фильтр городов
- ✅ 2.2.3 — анимация орбит, акцентный цвет #E8263A
- ✅ 2.2.4 — система доступов и ролей
- ✅ 2.2.5 — орбиты + цвет + смена + доступы объединённый
- ✅ 2.2.6 — умный бот Wazzup, ТГ формат, разделение смены, анимация, фикс Supabase
- 📋 2.2.7 — ассистент: задачи, CRM данные, режимы наблюдения, клавиша Ё
- 📋 2.3.0 — настройки 2 колонки, мобильная адаптация, фильтры дат
- 📋 2.4.0 — Чат редизайн (нужен платный Render)
- 📋 2.5.0 — Лента: блог, автопоздравления, топ в 10:00

## Структура фронтенда
src/App.jsx — главный файл, вся логика
src/auth.js — авторизация, все роли
src/theme.js — 10 тем оформления
src/supabase.js — подключение к БД
src/components:
  - KanbanBoard — канбан доска Wazzup
  - LeadCard — карточка заявки
  - LeadModal — модальное окно заявки (кнопка управления ботом)
  - StatsBar — карточки статистики вверху
  - Dashboard — дашборд
  - ExcelExport — экспорт
  - LoginPage — страница входа (чистая, без changelog на мобиле)
  - ChangelogWidget — список изменений
  - ContextMenu — контекстное меню (ПКМ)
  - DragDropModal — перетаскивание
  - ChatPage — чат (в разработке)
  - SettingsPage — настройки + панель доступов для dir/admin
  - KassaPage — касса (утренний/вечерний отчёт, фильтры)
  - ZrsPage — ЗРС
  - AttendanceSpo — отметка на смене (СПО)
  - AttendanceAdmin — отметка о прибытии (Админ состав)
  - TasksPage — задачи
  - SummaryPanel — сводка
  - Calculator — калькулятор
  - PlaceholderPages — заглушки
  - CrmAssistant — ИИ ассистент (орбитальная анимация, 3 режима)
  - permissions.js — логика прав доступа

## Пользователи системы
| Логин | Имя | Должность | Роль | Доступ |
|-------|-----|-----------|------|--------|
| zmsgrove | Админ | Администратор | admin | полный |
| maksatovs | Максатов Сырым | Директор | dir | полный |
| koshab | Кожа Бегдос | Зам. Директора | zamdir | полный |
| kylyshbaevam | Кылышбаева Макпал | Сис. Администратор | sysadmin | полный |
| revizor | СТ Ревизор | Ревизор | rev | полный |
| aleksandrovd | Александров Даниил | РГМ Уральск | rgmu | Уральск |
| aminovn | Аминов Нурлан | РГМ Атырау | rgma | Атырау |
| k162 | Филиал к162 | СПО Уральск | uralsk | Уральск |
| sv47 | Филиал св47 | СПО Уральск | uralsk | Уральск |
| s32 | Филиал с32 | СПО Атырау | atyray | Атырау |
| a21 | Филиал а21 | СПО Актобе | aktobe | Актобе |

## Кто управляет доступами
- admin (zmsgrove) — настраивает всех кроме себя и dir
- dir (maksatovs) — настраивает всех кроме себя и admin
- В списке выбора никогда не показывать admin и dir
- Остальные — не могут настраивать никого

## Таблицы Supabase
leads, messages, comments, bot_sessions, profiles, chats, chat_members,
chat_messages, chat_reactions, chat_reads, tasks, task_observers,
task_checklist, task_comments, task_history, task_templates, task_tags,
task_views, task_favorites, kassa_reports, kassa_comments, zrs_requests,
zrs_comments, shifts_spo, shifts_admin, user_settings, assistant_history,
price_list, user_permissions, user_cities, user_special

## Переменные окружения (Render бэкенд)
SUPABASE_URL, SUPABASE_SERVICE_KEY, WAZZUP_API_KEY, WAZZUP_CHANNEL_ID,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
TELEGRAM_CHAT_ID_ATYRAU (-1003824376670),
TELEGRAM_CHAT_ID_AKTOBE (-5193503852),
TELEGRAM_CHAT_ID_URALSK (-1003960163186),
ANTHROPIC_API_KEY

## CRM Ассистент
Файл: CrmAssistant.jsx + skupka-backend/src/index.js роут POST /api/assistant
Модель: claude-sonnet-4-5 (ассистент) + claude-haiku (бот клиентов)
Три режима: Скрытый (Ё) / Мини окно (клик) / Полный экран (⊞)
Горячая клавиша: Ё — зажал/говоришь/отпустил
Анимация: орбитальные кольца 3D, cyan #00E5FF
Источники цен: OLX.kz → Каспи объявления → магазины
Таблица маржи:
  - Телефоны: 40%
  - Ноутбуки, ТВ, PlayStation, Компьютеры: 50%
  - Кухонная техника: 60%
  - Строительные товары: 80%
  - Аксессуары (часы, наушники, планшеты): 50%
  - Всё остальное: 60%

## Бот для клиентов Wazzup
Файл: skupka-backend/src/index.js роут POST /webhook
Модель: claude-haiku (быстро и дёшево)
Диалог: максимум 3-4 сообщения
Языки: русский и казахский автоматически
Адреса:
  - Уральск: Курмангазы 162 и Северо-Восток 47
  - Атырау: Каныша Сатпаева 32
  - Актобе: Абулхаир хана 21
Ночной режим: 22:00-9:00 Астана (UTC+5)
Логика: handed_over в bot_sessions управляет активностью бота

## Правила разработки
- НЕ добавлять повторные useState/useEffect в конце файлов
- Скролл только внутри колонок канбана
- Хедер и сайдбар всегда фиксированы
- 10 тем в theme.js — не ломать
- Акцентный цвет #E8263A — вместо жёлтого/оранжевого
- Числа Фибоначчи: fib.xs=8, sm=13, md=21, lg=34, xl=55, xxl=89
- Glassmorphism на карточках, модалках, хедере, сайдбаре
- admin и dir — всегда полный доступ, не трогать
- Supabase v2 — НЕ использовать .catch() после запросов!
  Правильно: const { error } = await supabase.from(...).select()
- После каждого патча обновлять ChangelogWidget
- Коммиты: git add . && git commit -m "v2.x.x" && git push

## Деплой
- Фронт: git push → автодеплой на Render
- Бэк: git push в skupka-backend → автодеплой на Render
- Render бэкенд: https://skupka-backend.onrender.com