const express = require('express');

const router = express.Router();

function toInteger(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

const metricsListSql = `
  SELECT
    Products.id AS product_id,
    Products.name,
    Products.code,
    Products.type,
    Products.unit,
    Products.manufacturer,
    Products.is_active,
    COALESCE(ProductMetrics.planned_qty, 0) AS planned_qty,
    COALESCE(ProductMetrics.produced_qty, 0) AS produced_qty,
    COALESCE(ProductMetrics.defect_qty, 0) AS defect_qty,
    COALESCE(ProductMetrics.shipped_qty, 0) AS shipped_qty,
    COALESCE(ProductMetrics.utilized_qty, 0) AS utilized_qty,
    COALESCE(ProductMetrics.notes, '') AS notes,
    COALESCE(SUM(CASE WHEN Orders.status_id IN (1, 2, 4, 5) THEN Orders.amount ELSE 0 END), 0) AS active_order_qty,
    COALESCE(SUM(Orders.amount), 0) AS total_order_qty
  FROM Products
  LEFT JOIN ProductMetrics ON ProductMetrics.product_id = Products.id
  LEFT JOIN Orders ON Orders.product_id = Products.id
  GROUP BY
    Products.id,
    Products.name,
    Products.code,
    Products.type,
    Products.unit,
    Products.manufacturer,
    Products.is_active,
    ProductMetrics.planned_qty,
    ProductMetrics.produced_qty,
    ProductMetrics.defect_qty,
    ProductMetrics.shipped_qty,
    ProductMetrics.utilized_qty,
    ProductMetrics.notes
`;

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  db.all(`${metricsListSql} ORDER BY Products.name`, [], (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });

    res.json(
      rows.map((row) => ({
        ...row,
        available_qty: row.produced_qty - row.defect_qty - row.shipped_qty - row.utilized_qty,
        free_qty: row.produced_qty - row.defect_qty - row.shipped_qty - row.utilized_qty - row.active_order_qty,
        remaining_plan_qty: row.planned_qty - row.produced_qty
      }))
    );
  });
});

router.get('/:productId', (req, res) => {
  const db = req.app.locals.db;
  db.get(
    `${metricsListSql} HAVING Products.id = ? LIMIT 1`,
    [req.params.productId],
    (error, row) => {
      if (error) return res.status(500).json({ error: error.message });
      if (!row) return res.status(404).json({ error: 'Изделие не найдено' });

      res.json({
        ...row,
        available_qty: row.produced_qty - row.defect_qty - row.shipped_qty - row.utilized_qty,
        free_qty: row.produced_qty - row.defect_qty - row.shipped_qty - row.utilized_qty - row.active_order_qty,
        remaining_plan_qty: row.planned_qty - row.produced_qty
      });
    }
  );
});

router.put('/:productId', (req, res) => {
  const db = req.app.locals.db;
  const productId = toInteger(req.params.productId, null);

  if (!productId) {
    return res.status(400).json({ error: 'Некорректный идентификатор изделия' });
  }

  const payload = {
    plannedQty: toInteger(req.body.planned_qty, 0),
    producedQty: toInteger(req.body.produced_qty, 0),
    defectQty: toInteger(req.body.defect_qty, 0),
    shippedQty: toInteger(req.body.shipped_qty, 0),
    utilizedQty: toInteger(req.body.utilized_qty, 0),
    notes: normalizeText(req.body.notes) || ''
  };

  const sql = `
    INSERT INTO ProductMetrics (
      product_id,
      planned_qty,
      produced_qty,
      defect_qty,
      shipped_qty,
      utilized_qty,
      notes,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET
      planned_qty = excluded.planned_qty,
      produced_qty = excluded.produced_qty,
      defect_qty = excluded.defect_qty,
      shipped_qty = excluded.shipped_qty,
      utilized_qty = excluded.utilized_qty,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(
    sql,
    [
      productId,
      payload.plannedQty,
      payload.producedQty,
      payload.defectQty,
      payload.shippedQty,
      payload.utilizedQty,
      payload.notes
    ],
    function updateMetrics(error) {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ product_id: productId });
    }
  );
});

module.exports = router;
