CREATE TABLE IF NOT EXISTS Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  type TEXT,
  code TEXT,
  unit TEXT,
  manufacturer TEXT,
  comments TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  city TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  comments TEXT,
  is_internal INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS OrderTypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number INTEGER UNIQUE,
  product_id INTEGER,
  amount INTEGER NOT NULL DEFAULT 1,
  done_qty INTEGER NOT NULL DEFAULT 0,
  start_date TEXT DEFAULT CURRENT_DATE,
  finish_date TEXT,
  fact_date TEXT,
  customer_id INTEGER,
  department_id INTEGER,
  target_department_id INTEGER,
  producer_id INTEGER,
  responsible_id INTEGER,
  comments TEXT,
  type_id INTEGER,
  status_id INTEGER,
  main_order INTEGER,
  status_change_date TEXT DEFAULT CURRENT_DATE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES Products(id),
  FOREIGN KEY (customer_id) REFERENCES Customers(id),
  FOREIGN KEY (department_id) REFERENCES Departments(id),
  FOREIGN KEY (target_department_id) REFERENCES Departments(id),
  FOREIGN KEY (status_id) REFERENCES Statuses(id),
  FOREIGN KEY (type_id) REFERENCES OrderTypes(id)
);

CREATE TABLE IF NOT EXISTS DeletedOrders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_order_id INTEGER,
  order_number INTEGER,
  product_id INTEGER,
  amount INTEGER NOT NULL DEFAULT 1,
  done_qty INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  finish_date TEXT,
  fact_date TEXT,
  customer_id INTEGER,
  department_id INTEGER,
  target_department_id INTEGER,
  producer_id INTEGER,
  responsible_id INTEGER,
  comments TEXT,
  type_id INTEGER,
  status_id INTEGER,
  main_order INTEGER,
  status_change_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  snapshot_json TEXT
);

CREATE TABLE IF NOT EXISTS ProductMetrics (
  product_id INTEGER PRIMARY KEY,
  planned_qty INTEGER NOT NULL DEFAULT 0,
  produced_qty INTEGER NOT NULL DEFAULT 0,
  defect_qty INTEGER NOT NULL DEFAULT 0,
  shipped_qty INTEGER NOT NULL DEFAULT 0,
  utilized_qty INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES Products(id)
);

INSERT OR IGNORE INTO Statuses (id, name) VALUES
  (1, 'Новый'),
  (2, 'В работе'),
  (3, 'Готово'),
  (4, 'Запуск в производство'),
  (5, 'На согласовании'),
  (6, 'Отгружено');

UPDATE Statuses SET name = 'Новый' WHERE id = 1;
UPDATE Statuses SET name = 'В работе' WHERE id = 2;
UPDATE Statuses SET name = 'Готово' WHERE id = 3;
UPDATE Statuses SET name = 'Запуск в производство' WHERE id = 4;
UPDATE Statuses SET name = 'На согласовании' WHERE id = 5;
UPDATE Statuses SET name = 'Отгружено' WHERE id = 6;

INSERT OR IGNORE INTO OrderTypes (id, name) VALUES
  (1, 'Обычный'),
  (2, 'Серийный'),
  (3, 'Опытный образец');

UPDATE OrderTypes SET name = 'Обычный' WHERE id = 1;
UPDATE OrderTypes SET name = 'Серийный' WHERE id = 2;
UPDATE OrderTypes SET name = 'Опытный образец' WHERE id = 3;

INSERT OR IGNORE INTO Departments (id, name, is_active) VALUES
  (1, 'Производство', 1),
  (2, 'ОТК', 1),
  (3, 'Склад', 1),
  (4, 'Отгрузка', 1);

INSERT OR IGNORE INTO Customers (id, name, short_name, city, contact_person, phone, email, comments, is_internal, is_active) VALUES
  (1, 'Внутреннее производство', 'Внутреннее', 'Углич', 'Производственный отдел', '+7 (48532) 5-10-01', 'production@sktb.local', 'Внутренние производственные потребности', 1, 1),
  (2, 'Аквамарин АО', 'Аквамарин', 'Санкт-Петербург', 'Отдел комплектации', '+7 (812) 555-20-10', 'supply@aquamarine.example', 'Поставка по серийным изделиям', 0, 1),
  (3, 'НПП Радар ммс', 'Радар ммс', 'Санкт-Петербург', 'Проектный отдел', '+7 (812) 555-31-44', 'orders@radar.example', 'Заказы по опытным и серийным позициям', 0, 1),
  (4, 'Газпром 335', 'Газпром 335', 'Москва', 'Служба закупок', '+7 (495) 555-11-35', 'procurement@gazprom335.example', 'Перспективные поставки по датчикам давления', 0, 1);

INSERT OR IGNORE INTO Products (id, name, type, code, unit, manufacturer, comments, is_active) VALUES
  (1, 'РКМА-20-С', 'Сенсоры / Температурные', 'РКМА-20-С', 'шт', 'СКТБ ЭлПА', 'Серийная позиция для производственного плана', 1),
  (2, 'ПДК-2,5-0,06-МРТ14', 'Преобразователи / Давление', 'ПДК-2,5-0,06-МРТ14', 'шт', 'СКТБ ЭлПА', 'Преобразователь давления с частотным выходом', 1),
  (3, 'Мембрана 20x7x4', 'Комплектующие / Мембраны', '20x7x4', 'шт', 'СКТБ ЭлПА', 'Комплектующая для сборочных комплектов', 1),
  (4, 'Кварцевый резонатор ТЧ-42', 'Резонаторы / Термочувствительные', 'ТЧ-42', 'шт', 'СКТБ ЭлПА', 'Резервная позиция под опытные и серийные заказы', 1);

INSERT OR IGNORE INTO ProductMetrics (product_id, planned_qty, produced_qty, defect_qty, shipped_qty, utilized_qty, notes) VALUES
  (1, 120, 84, 2, 30, 1, 'Серийная позиция по текущему производственному плану'),
  (2, 65, 51, 1, 18, 0, 'Исполнение для заказов по датчикам давления'),
  (5, 240, 180, 5, 90, 3, 'Комплектующая для текущих сборок'),
  (12, 90, 42, 0, 16, 0, 'Резерв под заказы второго квартала');
