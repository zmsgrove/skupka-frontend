# SKUPKA CRM — Контекст проекта

## Стек
- React фронтенд (эта папка)
- Node.js бэкенд (папка skupka-backend рядом)
- Supabase — БД + Realtime
- Render — хостинг
- Wazzup — WhatsApp интеграция
- GitHub: zmsgrove/skupka-frontend и zmsgrove/skupka-backend

## Текущая версия: 2.2.2

## Дорожная карта
- ✅ 2.0.1–2.0.5 — фиксы: калькулятор, скролл канбана, сайдбар, Wazzup retry
- ✅ 2.0.6 — стартовый экран, настройки сводки, касса утро/вечер, срез за день
- ✅ 2.0.7 — карточки статистики, сводка хедер, фикс настроек
- ✅ 2.1.0 — Фибоначчи, glassmorphism, редизайн, 10 тем сохранены
- ✅ 2.1.1 — drag&drop, ПКМ, логика удаления, changelog, фикс настроек сводки
- ✅ 2.2.0 — CRM ассистент: плавающая кнопка, чат, web_search, голос, история 24ч
- ✅ 2.2.1 — фикс модели API, фикс insert Supabase, web search подключён
- ✅ 2.2.2 — системный промпт с маржой, орбитальная анимация, цвет #E8263A, фильтр городов
- 📋 2.3.0 — Google авторизация
- 📋 2.4.0 — Чат: редизайн, уведомления, онлайн статус, поиск (нужен платный Render)
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
  - AttendancePage — посещаемость (Смена)
  - TasksPage — задачи
  - SummaryPanel — сводка
  - Calculator — калькулятор
  - PlaceholderPages — заглушки
  - CrmAssistant — ИИ ассистент (плавающая кнопка, орбитальная анимация)

## Пользователи системы (11 аккаунтов)
Роли: admin, dir, zamdir, rgmu, rgma, city
Города: Атырау, Актобе, Уральск

## Таблицы Supabase
leads, messages, comments, bot_sessions, profiles, chats, chat_members,
chat_messages, chat_reactions, chat_reads, tasks, task_observers,
task_checklist, task_comments, task_history, task_templates, task_tags,
task_views, task_favorites, kassa_reports, kassa_comments, zrs_requests,
zrs_comments, shifts_spo, shifts_admin, user_settings, assistant_history,
price_list

## Переменные окружения (Render бэкенд)
SUPABASE_URL, SUPABASE_SERVICE_KEY, WAZZUP_API_KEY, WAZZUP_CHANNEL_ID,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
TELEGRAM_CHAT_ID_ATYRAU (-1003824376670),
TELEGRAM_CHAT_ID_AKTOBE (-5193503852),
TELEGRAM_CHAT_ID_URALSK (-1003960163186),
ANTHROPIC_API_KEY

## CRM Ассистент — системный промпт
Файл: skupka-backend/src/index.js роут POST /api/assistant
Модель: claude-sonnet-4-5
Источники цен: OLX.kz (главный) → Каспи объявления → магазины (справочно)
Таблица маржи:
  - Телефоны: 40%
  - Ноутбуки, ТВ, PlayStation, Компьютеры: 50%
  - Кухонная техника: 60%
  - Строительные товары: 80%
  - Аксессуары (часы, наушники, планшеты): 50%
  - Всё остальное: 60%
Формат ответа: кратко, максимум 10-15 строк
Детальный режим: если пишут 'подробно'
Фильтр городов: Общий (весь Казахстан) / Уральск / Актобе / Атырау

## Правила разработки
- НЕ добавлять повторные useState/useEffect в конце файлов
- Скролл только внутри колонок канбана
- Хедер и сайдбар всегда фиксированы
- 10 тем в theme.js — не ломать
- Акцентный цвет #E8263A (красный) — вместо старого жёлтого/оранжевого
- Числа Фибоначчи для отступов: fib.xs=8, sm=13, md=21, lg=34, xl=55, xxl=89
- Glassmorphism на карточках, модалках, хедере, сайдбаре
- Логика удаления: обычные роли → пометка "на удаление", admin/dir/zamdir → сразу
- После каждого патча обязательно обновлять ChangelogWidget
  с описанием текущей версии — изменения отражаются в виджете и на странице входа
- Коммиты: git add . && git commit -m "v2.x.x" && git push

## Деплой
- Фронт: git push → автодеплой на Render
- Бэк: git push в skupka-backend → автодеплой на Render
- Render бэкенд: https://skupka-backend.onrender.com