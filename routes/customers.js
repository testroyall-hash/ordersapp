const express = require('express');

const router = express.Router();

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function toBooleanInteger(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'on') {
    return 1;
  }

  return 0;
}

function mapCustomerPayload(body) {
  return {
    name: normalizeText(body.name),
    shortName: normalizeText(body.short_name),
    city: normalizeText(body.city),
    contactPerson: normalizeText(body.contact_person),
    phone: normalizeText(body.phone),
    email: normalizeText(body.email),
    comments: normalizeText(body.comments),
    isInternal: toBooleanInteger(body.is_internal, 0),
    isActive: toBooleanInteger(body.is_active, 1)
  };
}

function sendDbError(res, error) {
  if (error && error.message && error.message.includes('UNIQUE constraint failed')) {
    res.status(400).json({ error: 'Заказчик с таким названием уже существует' });
    return;
  }

  res.status(500).json({ error: error.message });
}

const customerListSql = `
  SELECT
    Customers.id,
    Customers.name,
    Customers.short_name,
    Customers.city,
    Customers.contact_person,
    Customers.phone,
    Customers.email,
    Customers.comments,
    Customers.is_internal,
    Customers.is_active,
    COUNT(Orders.id) AS orders_count
  FROM Customers
  LEFT JOIN Orders ON Orders.customer_id = Customers.id
  GROUP BY
    Customers.id,
    Customers.name,
    Customers.short_name,
    Customers.city,
    Customers.contact_person,
    Customers.phone,
    Customers.email,
    Customers.comments,
    Customers.is_internal,
    Customers.is_active
`;

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  db.all(`${customerListSql} ORDER BY Customers.name`, [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.get(
    `${customerListSql} HAVING Customers.id = ? LIMIT 1`,
    [req.params.id],
    (error, row) => {
      if (error) return res.status(500).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Заказчик не найден' });
      res.json(row);
    }
  );
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const payload = mapCustomerPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: 'Название заказчика обязательно' });
  }

  const sql = `
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      payload.name,
      payload.shortName,
      payload.city,
      payload.contactPerson,
      payload.phone,
      payload.email,
      payload.comments,
      payload.isInternal,
      payload.isActive
    ],
    function insertCustomer(error) {
      if (error) return sendDbError(res, error);
      res.status(201).json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const payload = mapCustomerPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: 'Название заказчика обязательно' });
  }

  const sql = `
    UPDATE Customers
    SET
      name = ?,
      short_name = ?,
      city = ?,
      contact_person = ?,
      phone = ?,
      email = ?,
      comments = ?,
      is_internal = ?,
      is_active = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      payload.name,
      payload.shortName,
      payload.city,
      payload.contactPerson,
      payload.phone,
      payload.email,
      payload.comments,
      payload.isInternal,
      payload.isActive,
      req.params.id
    ],
    function updateCustomer(error) {
      if (error) return sendDbError(res, error);
      if (!this.changes) return res.status(404).json({ error: 'Заказчик не найден' });
      res.json({ id: Number(req.params.id) });
    }
  );
});

module.exports = router;
