-- SKUPKA CRM v2.2.5 — Миграция системы доступов
-- Выполнить в Supabase SQL Editor

-- Права доступа по разделам
CREATE TABLE IF NOT EXISTS user_permissions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    text NOT NULL,
  page       text NOT NULL,
  can_view   boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit   boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  updated_by text,
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_page
  ON user_permissions(user_id, page);

-- Города пользователя (переопределение из auth.js)
CREATE TABLE IF NOT EXISTS user_cities (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  city    text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_cities_user_city
  ON user_cities(user_id, city);

-- Специальные права
CREATE TABLE IF NOT EXISTS user_special (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        text NOT NULL UNIQUE,
  is_tovarovyed  boolean DEFAULT false
);

-- Заполнение прав по умолчанию (запустить один раз)
-- Примеры для пользователей с ограниченным доступом:
INSERT INTO user_permissions (user_id, page, can_view, can_create, can_edit, can_delete, updated_by)
VALUES
  -- aleksandrovd (rgmu — Уральск)
  ('aleksandrovd','board',           true, true, true, false,'system'),
  ('aleksandrovd','dashboard',       true, false,false,false,'system'),
  ('aleksandrovd','chat',            true, true, true, false,'system'),
  ('aleksandrovd','tasks',           true, true, true, false,'system'),
  ('aleksandrovd','kassa',           true, true, true, false,'system'),
  ('aleksandrovd','zrs',             true, false,false,false,'system'),
  ('aleksandrovd','attendance_spo',  true, true, true, false,'system'),
  ('aleksandrovd','attendance_admin',true, false,false,false,'system'),
  ('aleksandrovd','tilda',           true, false,false,false,'system'),
  ('aleksandrovd','archive',         true, false,false,false,'system'),
  ('aleksandrovd','deleted',         false,false,false,false,'system'),
  -- aminovn (rgma — Атырау)
  ('aminovn','board',           true, true, true, false,'system'),
  ('aminovn','dashboard',       true, false,false,false,'system'),
  ('aminovn','chat',            true, true, true, false,'system'),
  ('aminovn','tasks',           true, true, true, false,'system'),
  ('aminovn','kassa',           true, true, true, false,'system'),
  ('aminovn','zrs',             true, false,false,false,'system'),
  ('aminovn','attendance_spo',  true, true, true, false,'system'),
  ('aminovn','attendance_admin',true, false,false,false,'system'),
  ('aminovn','tilda',           true, false,false,false,'system'),
  ('aminovn','archive',         true, false,false,false,'system'),
  ('aminovn','deleted',         false,false,false,false,'system'),
  -- k162, sv47 (uralsk — СПО Уральск)
  ('k162','board',           true, true, true, false,'system'),
  ('k162','chat',            true, true, false,false,'system'),
  ('k162','tasks',           true, true, true, false,'system'),
  ('k162','kassa',           true, true, false,false,'system'),
  ('k162','attendance_spo',  true, true, false,false,'system'),
  ('k162','tilda',           true, false,false,false,'system'),
  ('k162','archive',         true, false,false,false,'system'),
  ('sv47','board',           true, true, true, false,'system'),
  ('sv47','chat',            true, true, false,false,'system'),
  ('sv47','tasks',           true, true, true, false,'system'),
  ('sv47','kassa',           true, true, false,false,'system'),
  ('sv47','attendance_spo',  true, true, false,false,'system'),
  ('sv47','tilda',           true, false,false,false,'system'),
  ('sv47','archive',         true, false,false,false,'system'),
  -- s32 (atyray — СПО Атырау)
  ('s32','board',           true, true, true, false,'system'),
  ('s32','chat',            true, true, false,false,'system'),
  ('s32','tasks',           true, true, true, false,'system'),
  ('s32','kassa',           true, true, false,false,'system'),
  ('s32','attendance_spo',  true, true, false,false,'system'),
  ('s32','tilda',           true, false,false,false,'system'),
  ('s32','archive',         true, false,false,false,'system'),
  -- a21 (aktobe — СПО Актобе)
  ('a21','board',           true, true, true, false,'system'),
  ('a21','chat',            true, true, false,false,'system'),
  ('a21','tasks',           true, true, true, false,'system'),
  ('a21','kassa',           true, true, false,false,'system'),
  ('a21','attendance_spo',  true, true, false,false,'system'),
  ('a21','tilda',           true, false,false,false,'system'),
  ('a21','archive',         true, false,false,false,'system')
ON CONFLICT (user_id, page) DO NOTHING;

-- Города по умолчанию (из auth.js)
INSERT INTO user_cities (user_id, city) VALUES
  ('aleksandrovd','Уральск'),
  ('k162','Уральск'),('sv47','Уральск'),
  ('s32','Атырау'),
  ('a21','Актобе'),
  ('aminovn','Атырау'),
  ('revizor','Атырау'),('revizor','Актобе'),('revizor','Уральск')
ON CONFLICT (user_id, city) DO NOTHING;
