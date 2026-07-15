const express = require('express');

const router = express.Router();

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function toBooleanInteger(value, defaultValue = 1) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'on') {
    return 1;
  }

  return 0;
}

function toNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

const productGroups = [
  { min: 0, max: 999, name: 'БПИ' },
  { min: 1000, max: 1999, name: 'РКМА-Р' },
  { min: 2000, max: 2999, name: 'РКМА-Р-21' },
  { min: 3000, max: 3999, name: 'РКМА-ОС' },
  { min: 4000, max: 4999, name: 'Резонаторы' },
  { min: 5000, max: 5999, name: 'КЭ' },
  { min: 6000, max: 6999, name: 'ПЭ' }
];

function normalizeProductType(value) {
  return normalizeText(value) || 'Без группы';
}

function getProductGroupByType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return productGroups.find((group) => group.name.toLowerCase() === normalized) || null;
}

function canAssignProductIds(req) {
  return req.appUser?.role === 'director';
}

function requiresProductIdAssignment(type) {
  return Boolean(getProductGroupByType(type));
}

function getNextSourceId(db, type, currentSourceId, callback) {
  const group = getProductGroupByType(type);
  const currentNumber = Number(currentSourceId);

  if (!group) {
    if (Number.isInteger(currentNumber) && currentNumber < 0) {
      callback(null, currentNumber);
      return;
    }

    db.get(
      'SELECT COALESCE(MIN(source_id), 0) - 1 AS next_source_id FROM Products WHERE source_id < 0',
      [],
      (error, row) => {
        if (error) return callback(error);
        callback(null, Number(row.next_source_id || -1));
      }
    );
    return;
  }

  if (Number.isInteger(currentNumber) && currentNumber >= group.min && currentNumber <= group.max) {
    callback(null, currentNumber);
    return;
  }

  db.get(
    'SELECT COALESCE(MAX(source_id), ?) + 1 AS next_source_id FROM Products WHERE source_id BETWEEN ? AND ?',
    [group.min - 1, group.min, group.max],
    (error, row) => {
      if (error) return callback(error);
      const nextSourceId = Number(row.next_source_id);
      if (nextSourceId > group.max) {
        callback(new Error(`В группе "${group.name}" закончился диапазон ID`));
        return;
      }
      callback(null, nextSourceId);
    }
  );
}

function mapProductPayload(body) {
  return {
    sourceId: toNullableInteger(body.source_id),
    name: normalizeText(body.name),
    code: normalizeText(body.code),
    type: normalizeProductType(body.type),
    unit: normalizeText(body.unit),
    manufacturer: normalizeText(body.manufacturer),
    comments: normalizeText(body.comments),
    isActive: toBooleanInteger(body.is_active, 1)
  };
}

function sendDbError(res, error) {
  if (error && error.message && error.message.includes('UNIQUE constraint failed')) {
    if (error.message.includes('Products.source_id')) {
      res.status(400).json({ error: 'Изделие с таким ID уже существует' });
      return;
    }

    res.status(400).json({ error: 'Изделие с таким названием уже существует' });
    return;
  }

  res.status(500).json({ error: error.message });
}

const productListSql = `
  SELECT
    Products.id,
    Products.source_id,
    Products.name,
    Products.code,
    Products.type,
    Products.unit,
    Products.manufacturer,
    Products.comments,
    Products.is_active,
    COUNT(Orders.id) AS orders_count
  FROM Products
  LEFT JOIN Orders ON Orders.product_id = Products.id
  GROUP BY
    Products.id,
    Products.source_id,
    Products.name,
    Products.code,
    Products.type,
    Products.unit,
    Products.manufacturer,
    Products.comments,
    Products.is_active
`;

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  db.all(`${productListSql} ORDER BY Products.name`, [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.get(
    `${productListSql} HAVING Products.id = ? LIMIT 1`,
    [req.params.id],
    (error, row) => {
      if (error) return res.status(500).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Изделие не найдено' });
      res.json(row);
    }
  );
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const payload = mapProductPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: 'Название изделия обязательно' });
  }

  if (requiresProductIdAssignment(payload.type) && !canAssignProductIds(req)) {
    return res.status(403).json({ error: 'Назначать ID изделия по типу может только администратор' });
  }

  getNextSourceId(db, payload.type, null, (sourceError, sourceId) => {
    if (sourceError) return sendDbError(res, sourceError);

    const sql = `
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        sourceId,
        payload.name,
        payload.code,
        payload.type,
        payload.unit,
        payload.manufacturer,
        payload.comments,
        payload.isActive
      ],
      function insertProduct(error) {
        if (error) return sendDbError(res, error);
        res.status(201).json({ id: this.lastID });
      }
    );
  });
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const payload = mapProductPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: 'Название изделия обязательно' });
  }

  db.get('SELECT source_id, type FROM Products WHERE id = ?', [req.params.id], (selectError, currentProduct) => {
    if (selectError) return sendDbError(res, selectError);
    if (!currentProduct) return res.status(404).json({ error: 'Изделие не найдено' });

    const typeChanged = String(currentProduct.type || '') !== String(payload.type || '');
    const sourceIdInput = typeChanged ? null : currentProduct.source_id;

    if (typeChanged && requiresProductIdAssignment(payload.type) && !canAssignProductIds(req)) {
      return res.status(403).json({ error: 'Назначать ID изделия по типу может только администратор' });
    }

    getNextSourceId(db, payload.type, sourceIdInput, (sourceError, sourceId) => {
      if (sourceError) return sendDbError(res, sourceError);

      const sql = `
        UPDATE Products
        SET
          source_id = ?,
          name = ?,
          code = ?,
          type = ?,
          unit = ?,
          manufacturer = ?,
          comments = ?,
          is_active = ?
        WHERE id = ?
      `;

      db.run(
        sql,
        [
          sourceId,
          payload.name,
          payload.code,
          payload.type,
          payload.unit,
          payload.manufacturer,
          payload.comments,
          payload.isActive,
          req.params.id
        ],
        function updateProduct(error) {
          if (error) return sendDbError(res, error);
          if (!this.changes) return res.status(404).json({ error: 'Изделие не найдено' });
          res.json({ id: Number(req.params.id) });
        }
      );
    });
  });
});

module.exports = router;
