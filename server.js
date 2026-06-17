const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const productsRouter = require('./routes/products');
const productMetricsRouter = require('./routes/product-metrics');
const inventoryRouter = require('./routes/inventory');

const app = express();
const port = process.env.PORT || 3000;
const bundledDbPath = path.join(__dirname, 'db.sqlite3');
const dbPath = process.env.DB_PATH || bundledDbPath;
const initSqlPath = path.join(__dirname, 'db', 'init.sql');

function prepareDatabaseFile() {
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  if (dbPath !== bundledDbPath && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
    fs.copyFileSync(bundledDbPath, dbPath);
    console.log(`Copied bundled SQLite database to ${dbPath}`);
  }
}

prepareDatabaseFile();

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Failed to open database:', error.message);
    process.exit(1);
  }
});

function runStatements(statements, callback) {
  let index = 0;

  function next(error) {
    if (error) {
      callback(error);
      return;
    }

    if (index >= statements.length) {
      callback();
      return;
    }

    const statement = statements[index];
    index += 1;
    db.run(statement, next);
  }

  next();
}

function migrateTable(tableName, expectedColumns, callback) {
  db.all(`PRAGMA table_info(${tableName})`, [], (error, columns) => {
    if (error) {
      callback(error);
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));
    const statements = expectedColumns
      .filter((column) => !existingColumns.has(column.name))
      .map((column) => `ALTER TABLE ${tableName} ADD COLUMN ${column.definition}`);

    runStatements(statements, callback);
  });
}

function ensureTable(sql, callback) {
  db.run(sql, callback);
}

function migrateCustomersTable(callback) {
  migrateTable(
    'Customers',
    [
      { name: 'short_name', definition: 'short_name TEXT' },
      { name: 'city', definition: 'city TEXT' },
      { name: 'contact_person', definition: 'contact_person TEXT' },
      { name: 'phone', definition: 'phone TEXT' },
      { name: 'email', definition: 'email TEXT' },
      { name: 'comments', definition: 'comments TEXT' },
      { name: 'is_active', definition: 'is_active INTEGER NOT NULL DEFAULT 1' }
    ],
    callback
  );
}

function migrateProductsTable(callback) {
  migrateTable(
    'Products',
    [
      { name: 'code', definition: 'code TEXT' },
      { name: 'unit', definition: 'unit TEXT' },
      { name: 'manufacturer', definition: 'manufacturer TEXT' },
      { name: 'comments', definition: 'comments TEXT' },
      { name: 'is_active', definition: 'is_active INTEGER NOT NULL DEFAULT 1' }
    ],
    callback
  );
}

function migrateOrdersTable(callback) {
  migrateTable(
    'Orders',
    [
      { name: 'order_number', definition: 'order_number INTEGER' },
      { name: 'done_qty', definition: 'done_qty INTEGER NOT NULL DEFAULT 0' },
      { name: 'department_id', definition: 'department_id INTEGER' },
      { name: 'target_department_id', definition: 'target_department_id INTEGER' },
      { name: 'created_at', definition: 'created_at TEXT' },
      { name: 'updated_at', definition: 'updated_at TEXT' }
    ],
    callback
  );
}

function migrateInventoryMovementsTable(callback) {
  migrateTable(
    'InventoryMovements',
    [
      { name: 'customer_id', definition: 'customer_id INTEGER' }
    ],
    callback
  );
}

function createAdditionalTables(callback) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS Departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS DeletedOrders (
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
    )`,
    `CREATE TABLE IF NOT EXISTS InventoryMovements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL,
      sender_id INTEGER,
      receiver_id INTEGER,
      customer_id INTEGER,
      external_party TEXT,
      quantity INTEGER NOT NULL,
      movement_date TEXT NOT NULL DEFAULT CURRENT_DATE,
      comments TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products(id),
      FOREIGN KEY (sender_id) REFERENCES Departments(id),
      FOREIGN KEY (receiver_id) REFERENCES Departments(id),
      FOREIGN KEY (customer_id) REFERENCES Customers(id)
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON Orders(order_number)',
    'CREATE INDEX IF NOT EXISTS idx_orders_finish_date ON Orders(finish_date)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status_id ON Orders(status_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON Orders(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_product_id ON Orders(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_department_id ON Orders(department_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status_finish ON Orders(status_id, finish_date)',
    'CREATE INDEX IF NOT EXISTS idx_deleted_orders_deleted_at ON DeletedOrders(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_deleted_orders_finish_date ON DeletedOrders(finish_date)',
    'CREATE INDEX IF NOT EXISTS idx_deleted_orders_customer_id ON DeletedOrders(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_deleted_orders_product_id ON DeletedOrders(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON InventoryMovements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_sender_id ON InventoryMovements(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_receiver_id ON InventoryMovements(receiver_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_customer_id ON InventoryMovements(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON InventoryMovements(movement_date)',
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОМОК', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОС и ФЛГ 1', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОС и ФЛГ 2', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОТК', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОРиИ', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОП', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('ОС', 1)",
    "INSERT OR IGNORE INTO Departments (name, is_active) VALUES ('Изолятор брака', 1)",
    "INSERT OR IGNORE INTO Departments (id, name, is_active) VALUES (1, 'Производство', 1)",
    "INSERT OR IGNORE INTO Departments (id, name, is_active) VALUES (2, 'ОТК', 1)",
    "INSERT OR IGNORE INTO Departments (id, name, is_active) VALUES (3, 'Склад', 1)",
    "INSERT OR IGNORE INTO Departments (id, name, is_active) VALUES (4, 'Отгрузка', 1)",
    "UPDATE Statuses SET name = 'На согласовании' WHERE name = 'Выполняется'",
    'UPDATE Orders SET status_id = 2 WHERE status_id = 5',
    'UPDATE Orders SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)',
    'UPDATE Orders SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)'
  ];

  runStatements(statements, callback);
}

function fillOrderNumbers(callback) {
  db.all('SELECT id FROM Orders WHERE order_number IS NULL ORDER BY id', [], (error, rows) => {
    if (error) {
      callback(error);
      return;
    }

    if (!rows.length) {
      callback();
      return;
    }

    db.get('SELECT COALESCE(MAX(order_number), 0) AS max_number FROM Orders', [], (maxError, result) => {
      if (maxError) {
        callback(maxError);
        return;
      }

      let nextNumber = Number(result.max_number || 0);
      const statements = rows.map((row) => {
        nextNumber += 1;
        return `UPDATE Orders SET order_number = ${nextNumber} WHERE id = ${row.id}`;
      });

      runStatements(statements, callback);
    });
  });
}

function initializeDatabase(callback) {
  const initSql = fs.readFileSync(initSqlPath, 'utf8');

  db.exec(initSql, (error) => {
    if (error) {
      callback(error);
      return;
    }

    migrateCustomersTable((customersError) => {
      if (customersError) return callback(customersError);

      migrateProductsTable((productsError) => {
        if (productsError) return callback(productsError);

        migrateOrdersTable((ordersError) => {
          if (ordersError) return callback(ordersError);

          createAdditionalTables((extraError) => {
            if (extraError) return callback(extraError);

            migrateInventoryMovementsTable((inventoryError) => {
              if (inventoryError) return callback(inventoryError);

              fillOrderNumbers(callback);
            });
          });
        });
      });
    });
  });
}

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

app.locals.db = db;
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/product-metrics', productMetricsRouter);
app.use('/api/inventory', inventoryRouter);

app.get('/api/statuses', (req, res) => {
  db.all('SELECT id, name FROM Statuses ORDER BY id', [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
});

app.get('/api/types', (req, res) => {
  db.all('SELECT id, name FROM OrderTypes ORDER BY name', [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
});

app.post('/api/types', (req, res) => {
  const name = normalizeText(req.body.name);
  if (!name) {
    return res.status(400).json({ error: 'Название типа заказа обязательно' });
  }

  db.run('INSERT INTO OrderTypes (name) VALUES (?)', [name], function onInsert(error) {
    if (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Такой тип заказа уже существует' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ id: this.lastID });
  });
});

app.get('/api/departments', (req, res) => {
  db.all('SELECT id, name, is_active FROM Departments ORDER BY name', [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
});

app.post('/api/departments', (req, res) => {
  const name = normalizeText(req.body.name);
  if (!name) {
    return res.status(400).json({ error: 'Название отдела обязательно' });
  }

  db.run('INSERT INTO Departments (name, is_active) VALUES (?, 1)', [name], function onInsert(error) {
    if (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Такой отдел уже существует' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ id: this.lastID });
  });
});

app.put('/api/departments/:id', (req, res) => {
  const name = normalizeText(req.body.name);
  const isActive = req.body.is_active === false || req.body.is_active === '0' || req.body.is_active === 0 ? 0 : 1;

  if (!name) {
    return res.status(400).json({ error: 'Название отдела обязательно' });
  }

  db.run(
    'UPDATE Departments SET name = ?, is_active = ? WHERE id = ?',
    [name, isActive, req.params.id],
    function updateDepartment(error) {
      if (error) {
        if (error.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Такой отдел уже существует' });
        }
        return res.status(500).json({ error: error.message });
      }

      if (!this.changes) return res.status(404).json({ error: 'Отдел не найден' });
      res.json({ id: Number(req.params.id) });
    }
  );
});

app.delete('/api/departments/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Некорректный идентификатор отдела' });
  }

  const usageSql = `
    SELECT
      (SELECT COUNT(*) FROM Orders WHERE department_id = ? OR target_department_id = ?) AS orders_count,
      (SELECT COUNT(*) FROM DeletedOrders WHERE department_id = ? OR target_department_id = ?) AS deleted_orders_count,
      (SELECT COUNT(*) FROM InventoryMovements WHERE sender_id = ? OR receiver_id = ?) AS movements_count
  `;

  db.get(usageSql, [id, id, id, id, id, id], (usageError, usage) => {
    if (usageError) return res.status(500).json({ error: usageError.message });

    const totalUsage = Number(usage.orders_count || 0) + Number(usage.deleted_orders_count || 0) + Number(usage.movements_count || 0);
    if (totalUsage > 0) {
      return res.status(409).json({ error: 'Отдел уже используется в заказах или перемещениях. Его нельзя удалить, но можно переименовать.' });
    }

    db.run('DELETE FROM Departments WHERE id = ?', [id], function deleteDepartment(error) {
      if (error) return res.status(500).json({ error: error.message });
      if (!this.changes) return res.status(404).json({ error: 'Отдел не найден' });
      res.json({ id });
    });
  });
});

initializeDatabase((error) => {
  if (error) {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Orders app is running at http://localhost:${port}`);
  });
});

process.on('SIGINT', () => {
  db.close(() => {
    process.exit(0);
  });
});
