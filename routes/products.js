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

function mapProductPayload(body) {
  return {
    sourceId: toNullableInteger(body.source_id),
    name: normalizeText(body.name),
    code: normalizeText(body.code),
    type: normalizeText(body.type),
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
      payload.sourceId,
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

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const payload = mapProductPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: 'Название изделия обязательно' });
  }

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
      payload.sourceId,
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

module.exports = router;
