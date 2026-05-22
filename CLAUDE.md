# SKUPKA CRM — Контекст проекта

## Стек
- React фронтенд (эта папка)
- Node.js бэкенд (папка skupka-backend рядом)
- Supabase — БД + Realtime
- Render — хостинг
- Wazzup — WhatsApp интеграция
- GitHub: zmsgrove/skupka-frontend и zmsgrove/skupka-backend

## Текущая версия: 2.0.5 (задеплоена на Render)

## Дорожная карта
- ✅ 2.0.5 — фиксы: калькулятор, скролл колонок канбана, скролл фона при сводке, дублированный useEffect
- 📋 2.0.6 — логотип (favicon, хедер, логин страница)
- 📋 v8/Tilda — интеграция заявок с сайта

## Структура фронтенда
src/App.jsx — главный файл, вся логика
src/auth.js — авторизация
src/theme.js — темы
src/supabase.js — подключение к БД
src/components:
  - KanbanBoard — канбан доска
  - LeadCard — карточка заявки
  - LeadModal — модальное окно заявки
  - StatsBar — статистика
  - Dashboard — дашборд
  - ExcelExport — экспорт
  - LoginPage — страница входа
  - ChangelogWidget — список изменений
  - ContextMenu — контекстное меню
  - DragDropModal — перетаскивание
  - ChatPage — чат (в разработке)
  - SettingsPage — настройки
  - KassaPage — касса
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
leads, messages, comments, bot_sessions, profiles, chats, chat_members, chat_messages, chat_reactions, chat_reads, tasks, task_observers, task_checklist, task_comments, task_history, task_templates, task_tags, task_views, task_favorites, kassa_reports, kassa_comments, zrs_requests, zrs_comments, shifts_spo, shifts_admin

## Переменные окружения (Render бэкенд)
SUPABASE_URL, SUPABASE_SERVICE_KEY, WAZZUP_API_KEY, WAZZUP_CHANNEL_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CHAT_ID_ATYRAU, TELEGRAM_CHAT_ID_AKTOBE, TELEGRAM_CHAT_ID_URALSK

## Правила разработки
- Архивы ZIP отдельно для фронта и бэка после каждого патча
- Коммиты: git add . && git commit -m "v2.0.5" && git push
- НЕ добавлять повторные объявления useState/useEffect в конце файлов
- Скролл только внутри колонок канбана
- Хедер и сайдбар всегда фиксированы
- Версионирование: 2.0.4, 2.0.5, 2.0.6 и т.д.

## Деплой
- Фронт: git push → автодеплой на Render
- Бэк: git push в skupka-backend → автодеплой на Render