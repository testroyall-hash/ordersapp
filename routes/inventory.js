const express = require('express');

const router = express.Router();

const movementTypes = [
  {
    id: 'produced',
    name: 'Продукция изготовлена',
    description: 'Вновь изготовленная продукция',
    senderRequired: false,
    receiverRequired: true
  },
  {
    id: 'to_work',
    name: 'Передать в работу',
    description: 'Передача продукции в работу',
    senderRequired: true,
    receiverRequired: false
  },
  {
    id: 'transfer',
    name: 'Передать в другой отдел',
    description: 'Передача продукции из отдела в отдел',
    senderRequired: true,
    receiverRequired: true
  },
  {
    id: 'defect',
    name: 'Списать брак',
    description: 'Учет забракованной продукции',
    senderRequired: true,
    receiverRequired: true
  },
  {
    id: 'ship',
    name: 'Отгрузить заказчику',
    description: 'Отгрузка продукции заказчику или внутреннему получателю',
    senderRequired: true,
    receiverRequired: false
  },
  {
    id: 'supplier_receipt',
    name: 'Получено от поставщика',
    description: 'Получение продукции от поставщика',
    senderRequired: false,
    receiverRequired: true
  },
  {
    id: 'utilize',
    name: 'Утилизировать',
    description: 'Передача продукции на утилизацию',
    senderRequired: true,
    receiverRequired: false
  },
  {
    id: 'inventory',
    name: 'Инвентаризация',
    description: 'Корректировка остатков по результатам инвентаризации',
    senderRequired: false,
    receiverRequired: false
  }
];

const movementTypeById = new Map(movementTypes.map((type) => [type.id, type]));

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function toInteger(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
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

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function sendAsync(handler) {
  return (req, res) => {
    handler(req, res).catch((error) => {
      res.status(500).json({ error: error.message });
    });
  };
}

function mapMovement(row) {
  return {
    ...row,
    type_name: movementTypeById.get(row.movement_type)?.name || row.movement_type,
    receiver_label: row.receiver_name || row.customer_name || row.external_party || null
  };
}

const balanceCte = `
  WITH movement_balance AS (
    SELECT product_id, receiver_id AS department_id, quantity AS delta
    FROM InventoryMovements
    WHERE receiver_id IS NOT NULL
    UNION ALL
    SELECT product_id, sender_id AS department_id, -quantity AS delta
    FROM InventoryMovements
    WHERE sender_id IS NOT NULL
  )
`;

router.get('/movement-types', (req, res) => {
  res.json(movementTypes);
});

router.get(
  '/',
  sendAsync(async (req, res) => {
    const db = req.app.locals.db;
    const rows = await all(
      db,
      `
        ${balanceCte},
        product_movement AS (
          SELECT product_id, COALESCE(SUM(delta), 0) AS movement_qty
          FROM movement_balance
          GROUP BY product_id
        ),
        product_orders AS (
          SELECT product_id, COALESCE(SUM(amount), 0) AS active_order_qty
          FROM Orders
          WHERE status_id IN (1, 2, 4, 5)
          GROUP BY product_id
        )
        SELECT
          Products.id AS product_id,
          Products.name,
          Products.code,
          Products.type,
          Products.unit,
          Products.manufacturer,
          COALESCE(ProductMetrics.produced_qty, 0) AS produced_qty,
          COALESCE(ProductMetrics.defect_qty, 0) AS defect_qty,
          COALESCE(ProductMetrics.shipped_qty, 0) AS shipped_qty,
          COALESCE(ProductMetrics.utilized_qty, 0) AS utilized_qty,
          COALESCE(product_movement.movement_qty, 0) AS movement_qty,
          COALESCE(product_orders.active_order_qty, 0) AS active_order_qty
        FROM Products
        LEFT JOIN ProductMetrics ON ProductMetrics.product_id = Products.id
        LEFT JOIN product_movement ON product_movement.product_id = Products.id
        LEFT JOIN product_orders ON product_orders.product_id = Products.id
        ORDER BY Products.name
      `
    );

    res.json(
      rows.map((row) => {
        const metricAvailable = row.produced_qty - row.defect_qty - row.shipped_qty - row.utilized_qty;
        const availableQty = row.movement_qty || metricAvailable;
        return {
          ...row,
          metric_available_qty: metricAvailable,
          available_qty: availableQty,
          free_qty: availableQty - row.active_order_qty
        };
      })
    );
  })
);

router.get(
  '/products/:productId',
  sendAsync(async (req, res) => {
    const db = req.app.locals.db;
    const productId = toInteger(req.params.productId, null);

    if (!productId) {
      res.status(400).json({ error: 'Некорректный идентификатор изделия' });
      return;
    }

    const product = await get(
      db,
      `
        SELECT
          Products.id AS product_id,
          Products.name,
          Products.code,
          Products.type,
          Products.unit,
          Products.manufacturer,
          COALESCE(ProductMetrics.produced_qty, 0) AS produced_qty,
          COALESCE(ProductMetrics.defect_qty, 0) AS defect_qty,
          COALESCE(ProductMetrics.shipped_qty, 0) AS shipped_qty,
          COALESCE(ProductMetrics.utilized_qty, 0) AS utilized_qty,
          COALESCE(ProductMetrics.notes, '') AS notes
        FROM Products
        LEFT JOIN ProductMetrics ON ProductMetrics.product_id = Products.id
        WHERE Products.id = ?
      `,
      [productId]
    );

    if (!product) {
      res.status(404).json({ error: 'Изделие не найдено' });
      return;
    }

    const balances = await all(
      db,
      `
        ${balanceCte}
        SELECT
          Departments.id AS department_id,
          Departments.name AS department_name,
          COALESCE(SUM(movement_balance.delta), 0) AS quantity
        FROM Departments
        LEFT JOIN movement_balance
          ON movement_balance.department_id = Departments.id
          AND movement_balance.product_id = ?
        GROUP BY Departments.id, Departments.name
        HAVING quantity != 0
        ORDER BY Departments.name
      `,
      [productId]
    );

    const movements = await all(
      db,
      `
        SELECT
          InventoryMovements.*,
          Products.name AS product_name,
          sender.name AS sender_name,
          receiver.name AS receiver_name,
          Customers.name AS customer_name
        FROM InventoryMovements
        LEFT JOIN Products ON Products.id = InventoryMovements.product_id
        LEFT JOIN Departments sender ON sender.id = InventoryMovements.sender_id
        LEFT JOIN Departments receiver ON receiver.id = InventoryMovements.receiver_id
        LEFT JOIN Customers ON Customers.id = InventoryMovements.customer_id
        WHERE InventoryMovements.product_id = ?
        ORDER BY InventoryMovements.movement_date DESC, InventoryMovements.id DESC
        LIMIT 100
      `,
      [productId]
    );

    const metricAvailable = product.produced_qty - product.defect_qty - product.shipped_qty - product.utilized_qty;
    const movementQty = balances.reduce((sum, row) => sum + row.quantity, 0);

    res.json({
      product: {
        ...product,
        metric_available_qty: metricAvailable,
        movement_qty: movementQty,
        available_qty: movementQty || metricAvailable
      },
      balances,
      movements: movements.map(mapMovement)
    });
  })
);

router.post(
  '/movements',
  sendAsync(async (req, res) => {
    const db = req.app.locals.db;
    const productId = toInteger(req.body.product_id, null);
    const movementType = normalizeText(req.body.movement_type);
    const type = movementTypeById.get(movementType);
    const senderId = toInteger(req.body.sender_id, null);
    const receiverId = toInteger(req.body.receiver_id, null);
    const customerId = toInteger(req.body.customer_id, null);
    const quantity = toInteger(req.body.quantity, 0);
    const movementDate = normalizeText(req.body.movement_date) || new Date().toISOString().slice(0, 10);
    const externalParty = normalizeText(req.body.external_party);
    const comments = normalizeText(req.body.comments);

    if (!productId) {
      res.status(400).json({ error: 'Выберите изделие' });
      return;
    }

    if (!type) {
      res.status(400).json({ error: 'Выберите тип перемещения' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ error: 'Количество должно быть больше нуля' });
      return;
    }

    if (type.senderRequired && !senderId) {
      res.status(400).json({ error: 'Для этой операции нужен отправитель' });
      return;
    }

    if (type.receiverRequired && !receiverId) {
      res.status(400).json({ error: 'Для этой операции нужен получатель' });
      return;
    }

    if (movementType === 'ship' && !receiverId && !customerId && !externalParty) {
      res.status(400).json({ error: 'Для отгрузки укажите отдел-получатель, заказчика или внешнего контрагента' });
      return;
    }

    if (movementType === 'inventory' && !senderId && !receiverId) {
      res.status(400).json({ error: 'Для инвентаризации укажите отправителя или получателя' });
      return;
    }

    if (senderId && receiverId && senderId === receiverId) {
      res.status(400).json({ error: 'Отправитель и получатель должны отличаться' });
      return;
    }

    const product = await get(db, 'SELECT id FROM Products WHERE id = ?', [productId]);
    if (!product) {
      res.status(404).json({ error: 'Изделие не найдено' });
      return;
    }

    if (customerId) {
      const customer = await get(db, 'SELECT id FROM Customers WHERE id = ?', [customerId]);
      if (!customer) {
        res.status(404).json({ error: 'Заказчик не найден' });
        return;
      }
    }

    const result = await run(
      db,
      `
        INSERT INTO InventoryMovements (
          product_id,
          movement_type,
          sender_id,
          receiver_id,
          customer_id,
          external_party,
          quantity,
          movement_date,
          comments
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [productId, movementType, senderId, receiverId, customerId, externalParty, quantity, movementDate, comments]
    );

    res.status(201).json({ id: result.lastID });
  })
);

module.exports = router;
