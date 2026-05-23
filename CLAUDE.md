# SKUPKA CRM — Контекст проекта

## Стек
- React фронтенд (эта папка)
- Node.js бэкенд (папка skupka-backend рядом)
- Supabase — БД + Realtime
- Render — хостинг
- Wazzup — WhatsApp интеграция
- GitHub: zmsgrove/skupka-frontend и zmsgrove/skupka-backend

## Текущая версия: 2.0.7

## Дорожная карта
- ✅ 2.0.1–2.0.5 — фиксы: калькулятор, скролл канбана, сайдбар, сводка, Wazzup retry
- ✅ 2.0.6 — changelog, стартовый экран, настройки сводки, касса утро/вечер, срез за день
- ✅ 2.0.7 — карточки статистики одинаковый размер, сводка в хедере фильтр утро/вечер, настройки сводки в SettingsPage
- 📋 2.1.0 — Фибоначчи + редизайн всего проекта (лёгкий UI, золотое сечение, 10 тем сохранить)
- 📋 2.2.0 — CRM ассистент для оценки техники
- 📋 2.3.0 — Google авторизация
- 📋 2.4.0 — Чат: редизайн, уведомления, статус прочитано, онлайн статус, поиск
- 📋 2.5.0 — Лента: блог, автопоздравления, топ в 10:00, события

## Структура фронтенда
src/App.jsx — главный файл, вся логика
src/auth.js — авторизация
src/theme.js — 10 тем оформления
src/supabase.js — подключение к БД
src/components:
  - KanbanBoard — канбан доска
  - LeadCard — карточка заявки
  - LeadModal — модальное окно заявки
  - StatsBar — карточки статистики вверху
  - Dashboard — дашборд
  - ExcelExport — экспорт
  - LoginPage — страница входа
  - ChangelogWidget — список изменений
  - ContextMenu — контекстное меню
  - DragDropModal — перетаскивание
  - ChatPage — чат (в разработке)
  - SettingsPage — настройки
  - KassaPage — касса (утренний/вечерний отчёт)
  - ZrsPage — ЗРС
  - AttendancePage — посещаемость
  - TasksPage — задачи
  - SummaryPanel — сводка
  - Calculator — калькулятор
  - PlaceholderPages — заглушки

## Пользователи системы (11 аккаунтов)
Роли: admin, dir, zamdir, rgmu, rgma, city
Города: Атырау, Актобе, Уральск

## Таблицы Supabase
leads, messages, comments, bot_sessions, profiles, chats, chat_members,
chat_messages, chat_reactions, chat_reads, tasks, task_observers,
task_checklist, task_comments, task_history, task_templates, task_tags,
task_views, task_favorites, kassa_reports, kassa_comments, zrs_requests,
zrs_comments, shifts_spo, shifts_admin, user_settings

## Переменные окружения (Render бэкенд)
SUPABASE_URL, SUPABASE_SERVICE_KEY, WAZZUP_API_KEY, WAZZUP_CHANNEL_ID,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
TELEGRAM_CHAT_ID_ATYRAU (-1003824376670),
TELEGRAM_CHAT_ID_AKTOBE (-5193503852),
TELEGRAM_CHAT_ID_URALSK (-1003960163186)

## Правила разработки
- НЕ добавлять повторные useState/useEffect в конце файлов
- Скролл только внутри колонок канбана
- Хедер и сайдбар всегда фиксированы
- 10 тем в theme.js — не ломать
- Коммиты: git add . && git commit -m "v2.0.7" && git push
- Версионирование: 2.0.6, 2.0.7, 2.1.0 и т.д.

## Деплой
- Фронт: git push → автодеплой на Render
- Бэк: git push в skupka-backend → автодеплой на Render