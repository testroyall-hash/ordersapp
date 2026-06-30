const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'db.sqlite3');
const dataDir = path.join(__dirname, '..', 'data', 'access-import');

function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function shouldSkipCustomer(name) {
  const normalized = normalizeText(name);
  if (!normalized) return true;
  return normalized.startsWith('Выбрать ');
}

function isInternalCustomerName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return false;

  return [
    'ОРиИ',
    'ОТК',
    'ОМОК',
    'ОСиФЛГ',
    'ОП',
    'ТО',
    'Директор',
    'зам. директора по производству',
    'зам. директора по Пр-ву',
    'Главный инженер',
    'Изолятор брака',
    'Утилизация',
    'Производство',
    'Склад',
    'Отгрузка'
  ].includes(normalized);
}

function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/\/Date\((\d+)\)\//);
    if (match) {
      const ms = Number(match[1]);
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mapOrderStatus(statusName) {
  const normalized = normalizeText(statusName)?.toLowerCase() || '';
  if (normalized.includes('отгруж')) return 6;
  if (normalized.includes('выполн')) return 3;
  if (normalized.includes('запуск')) return 4;
  if (normalized.includes('соглас')) return 5;
  if (normalized.includes('работ')) return 2;
  return 1;
}

function mapProductType(productName) {
  const name = normalizeText(productName) || '';
  if (name.startsWith('РКМА')) return 'Сенсоры / Температурные';
  if (name.startsWith('ПДК')) return 'Преобразователи / Давление';
  if (name.includes('Мембрана')) return 'Комплектующие / Мембраны';
  if (name.includes('резонатор') || name.includes('Резонатор')) return 'Резонаторы / Термочувствительные';
  return 'Неклассифицированные / Без группы';
}

async function ensureDepartment(db, cache, name) {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized);

  const existing = await get(db, 'SELECT id FROM Departments WHERE name = ?', [normalized]);
  if (existing) {
    cache.set(normalized, existing.id);
    return existing.id;
  }

  const result = await run(db, 'INSERT INTO Departments (name, is_active) VALUES (?, 1)', [normalized]);
  cache.set(normalized, result.lastID);
  return result.lastID;
}

async function ensureCustomer(db, cache, name, sourceRow = null) {
  const normalized = normalizeText(name);
  if (!normalized || shouldSkipCustomer(normalized)) return null;
  if (cache.has(normalized)) return cache.get(normalized);

  const existing = await get(db, 'SELECT id FROM Customers WHERE name = ?', [normalized]);
  if (existing) {
    cache.set(normalized, existing.id);
    return existing.id;
  }

  const result = await run(
    db,
    `
      INSERT INTO Customers (
        name,
        short_name,
        city,
        contact_person,
        phone,
        email,
        comments,
        is_internal,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
      [
        normalized,
        normalized,
        sourceRow?.Address ? 'Углич' : null,
        normalizeText(sourceRow?.ContactPersons),
        normalizeText(sourceRow?.PhoneNumbers),
        normalizeText(sourceRow?.EMails),
        normalizeText(sourceRow?.PostAddress),
        isInternalCustomerName(normalized) ? 1 : 0
      ]
  );
  cache.set(normalized, result.lastID);
  return result.lastID;
}

async function ensureProduct(db, cache, row, companyById) {
  const name = normalizeText(row.ProductName);
  if (!name) return null;
  if (cache.has(row.ID)) return cache.get(row.ID);

  const existing = await get(db, 'SELECT id FROM Products WHERE name = ?', [name]);
  const manufacturer = companyById.get(toNumber(row.ProducerID)) || 'СКТБ ЭлПА';
  const type = mapProductType(name);

  if (existing) {
    await run(
      db,
      `
        UPDATE Products
        SET source_id = ?,
            code = COALESCE(code, ?),
            type = COALESCE(type, ?),
            unit = COALESCE(unit, ?),
            manufacturer = COALESCE(manufacturer, ?),
            comments = COALESCE(comments, ?),
            is_active = 1
        WHERE id = ?
      `,
      [
        toNumber(row.ID),
        name,
        type,
        normalizeText(row.Units) || 'шт',
        manufacturer,
        normalizeText(row.Discription) || normalizeText(row.Status),
        existing.id
      ]
    );
    cache.set(row.ID, existing.id);
    return existing.id;
  }

  const result = await run(
    db,
    `
      INSERT INTO Products (
        source_id,
        name,
        code,
        type,
        unit,
        manufacturer,
        comments,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `,
    [
      toNumber(row.ID),
      name,
      name,
      type,
      normalizeText(row.Units) || 'шт',
      manufacturer,
      normalizeText(row.Discription) || normalizeText(row.Status)
    ]
  );
  cache.set(row.ID, result.lastID);
  return result.lastID;
}

async function main() {
  const db = new sqlite3.Database(dbPath);

  const productColumns = await new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(Products)', [], (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
  if (!productColumns.some((column) => column.name === 'source_id')) {
    await run(db, 'ALTER TABLE Products ADD COLUMN source_id INTEGER');
  }
  await run(
    db,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_id ON Products(source_id) WHERE source_id IS NOT NULL'
  );

  const companies = readJson('tblCompanys.json');
  const employees = readJson('tblEmployee.json');
  const products = readJson('tblProducts.json');
  const orders = readJson('tblOrders.json');
  const storage = readJson('tblStorage.json');

  const companyById = new Map(companies.map((row) => [toNumber(row.ID), normalizeText(row.CompanyName)]));
  const companyRowByName = new Map(companies.map((row) => [normalizeText(row.CompanyName), row]));

  const departmentCache = new Map();
  const customerCache = new Map();
  const productCache = new Map();

  for (const employee of employees) {
    await ensureDepartment(db, departmentCache, employee.Departament);
  }

  for (const row of orders) {
    await ensureDepartment(db, departmentCache, row.Producer);
  }

  for (const row of storage) {
    await ensureDepartment(db, departmentCache, row.Account);
    await ensureDepartment(db, departmentCache, row.SrcDst);
  }

  for (const row of companies) {
    await ensureCustomer(db, customerCache, row.CompanyName, row);
  }

  for (const row of orders) {
    const customerName = normalizeText(row.Customer);
    if (customerName) {
      const sourceRow = companyRowByName.get(customerName) || null;
      await ensureCustomer(db, customerCache, customerName, sourceRow);
    }
  }

  for (const row of products) {
    await ensureProduct(db, productCache, row, companyById);
  }

  const doneByOrderNumber = new Map();
  for (const row of storage) {
    if (normalizeText(row.Status) === 'Продукция изготовлена' && row.Success === true) {
      const orderNum = toNumber(row.OrderNum, null);
      if (!orderNum) continue;
      doneByOrderNumber.set(orderNum, (doneByOrderNumber.get(orderNum) || 0) + Math.max(0, toNumber(row.Amount)));
    }
  }

  const routeByOrderNumber = new Map();
  for (const row of storage) {
    const orderNum = toNumber(row.OrderNum, null);
    if (!orderNum) continue;

    const current = routeByOrderNumber.get(orderNum);
    const currentDate = current ? new Date(current.TransferDate).getTime() : 0;
    const rowDate = new Date(row.TransferDate).getTime();

    if (!current || rowDate >= currentDate) {
      routeByOrderNumber.set(orderNum, row);
    }
  }

  await run(db, 'DELETE FROM DeletedOrders');
  await run(db, 'DELETE FROM Orders');
  await run(db, "DELETE FROM Customers WHERE name LIKE 'Выбрать %'");

  for (const row of orders) {
    const productId = productCache.get(toNumber(row.ProductID));
    const customerName = normalizeText(row.Customer);
    const customerId = customerName ? customerCache.get(customerName) : null;
    const routeRow = routeByOrderNumber.get(toNumber(row.Num));
    const doneQty = Math.min(Math.max(0, doneByOrderNumber.get(toNumber(row.Num)) || 0), Math.max(0, toNumber(row.Amount)));
    const amount = Math.max(0, toNumber(row.Amount, 0));
    const departmentId = await ensureDepartment(db, departmentCache, routeRow?.Account || row.Producer);
    const targetDepartmentId = await ensureDepartment(db, departmentCache, routeRow?.SrcDst);

    await run(
      db,
      `
        INSERT INTO Orders (
          order_number,
          product_id,
          amount,
          done_qty,
          start_date,
          finish_date,
          fact_date,
          customer_id,
          department_id,
          target_department_id,
          comments,
          type_id,
          status_id,
          main_order,
          status_change_date,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        toNumber(row.Num),
        productId || null,
        amount,
        doneQty,
        formatDate(row.StartDate),
        formatDate(row.FinishDate),
        normalizeText(row.Status) === 'Выполнен' ? formatDate(row.StatusChangeDate) : null,
        customerId || null,
        departmentId,
        targetDepartmentId,
        normalizeText(row.Comments),
        1,
        mapOrderStatus(row.Status),
        toNumber(row.MainOrderNum, null),
        formatDate(row.StatusChangeDate) || formatDate(row.StartDate),
        formatDate(row.StartDate),
        formatDate(row.StatusChangeDate) || formatDate(row.StartDate)
      ]
    );
  }

  console.log(`Imported: ${products.length} products, ${orders.length} orders, ${companies.length} companies, ${employees.length} employees`);
  db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
