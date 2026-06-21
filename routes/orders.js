const express = require('express');

const router = express.Router();

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

function createZip(entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = getDosDateTime();

  entries.forEach((entry) => {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    fileParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, ...centralParts, end]);
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatDateRu(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

function formatOrderNumber(value) {
  return value ? `№ ${String(value).padStart(4, '0')}` : '—';
}

function textRun(value, options = {}) {
  const props = [
    options.bold ? '<w:b/>' : '',
    options.size ? `<w:sz w:val="${options.size}"/>` : '',
    options.color ? `<w:color w:val="${options.color}"/>` : ''
  ].join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
}

function paragraph(value, options = {}) {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = options.after ? `<w:spacing w:after="${options.after}"/>` : '';
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : '';
  const pPr = style || align || spacing ? `<w:pPr>${style}${align}${spacing}</w:pPr>` : '';
  return `<w:p>${pPr}${textRun(value, options)}</w:p>`;
}

function tableCell(value, options = {}) {
  const shading = options.shading ? `<w:shd w:fill="${options.shading}"/>` : '';
  const width = options.width ? `<w:tcW w:w="${options.width}" w:type="dxa"/>` : '';
  const valign = '<w:vAlign w:val="center"/>';
  const p = paragraph(value, { bold: options.bold, size: options.size || 18, align: options.align || 'left' });
  return `<w:tc><w:tcPr>${width}${shading}${valign}</w:tcPr>${p}</w:tc>`;
}

function tableRow(cells) {
  return `<w:tr>${cells.join('')}</w:tr>`;
}

function buildPlanDocx(rows, meta) {
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalDone = rows.reduce((sum, row) => sum + Number(row.done_qty || 0), 0);
  const totalRemaining = rows.reduce((sum, row) => sum + Number(row.remaining_qty || 0), 0);
  const filterLine = [
    meta.dateFrom ? `с ${formatDateRu(meta.dateFrom)}` : '',
    meta.dateTo ? `по ${formatDateRu(meta.dateTo)}` : '',
    meta.customerName ? `заказчик: ${meta.customerName}` : '',
    meta.productName ? `изделие: ${meta.productName}` : '',
    meta.statusNames.length ? `статусы: ${meta.statusNames.join(', ')}` : ''
  ].filter(Boolean).join('; ') || 'без дополнительных фильтров';

  const header = tableRow([
    tableCell('№', { bold: true, shading: 'E9EEF7', width: 900, align: 'center' }),
    tableCell('Изделие', { bold: true, shading: 'E9EEF7', width: 2600 }),
    tableCell('Заказчик', { bold: true, shading: 'E9EEF7', width: 2300 }),
    tableCell('План', { bold: true, shading: 'E9EEF7', width: 800, align: 'center' }),
    tableCell('Сделано', { bold: true, shading: 'E9EEF7', width: 900, align: 'center' }),
    tableCell('Осталось', { bold: true, shading: 'E9EEF7', width: 900, align: 'center' }),
    tableCell('Срок', { bold: true, shading: 'E9EEF7', width: 1100, align: 'center' }),
    tableCell('Отдел', { bold: true, shading: 'E9EEF7', width: 1700 }),
    tableCell('Статус', { bold: true, shading: 'E9EEF7', width: 1500 })
  ]);

  const bodyRows = rows.map((row) => tableRow([
    tableCell(formatOrderNumber(row.order_number), { align: 'center' }),
    tableCell([row.product_name, row.product_code].filter(Boolean).join('\n')),
    tableCell(row.customer_name || '—'),
    tableCell(row.amount, { align: 'center' }),
    tableCell(row.done_qty, { align: 'center' }),
    tableCell(row.remaining_qty, { align: 'center' }),
    tableCell(formatDateRu(row.finish_date), { align: 'center' }),
    tableCell(row.department_name || '—'),
    tableCell(row.status_name || '—')
  ])).join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraph('План выполнения заказов', { style: 'Title', bold: true, size: 36, align: 'center', after: 160 })}
    ${paragraph(`Сформировано: ${formatDateRu(new Date().toISOString())}`, { align: 'center', size: 20, color: '666666', after: 120 })}
    ${paragraph(`Фильтры: ${filterLine}`, { size: 20, after: 160 })}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="AAB4C5"/>
          <w:left w:val="single" w:sz="4" w:color="AAB4C5"/>
          <w:bottom w:val="single" w:sz="4" w:color="AAB4C5"/>
          <w:right w:val="single" w:sz="4" w:color="AAB4C5"/>
          <w:insideH w:val="single" w:sz="4" w:color="D7DEE9"/>
          <w:insideV w:val="single" w:sz="4" w:color="D7DEE9"/>
        </w:tblBorders>
      </w:tblPr>
      ${header}
      ${bodyRows || tableRow([tableCell('По выбранным условиям план пуст.', { width: 14000 })])}
    </w:tbl>
    ${paragraph(`Итого: заказов ${rows.length}; план ${totalAmount}; сделано ${totalDone}; осталось ${totalRemaining}.`, { bold: true, size: 22, after: 120 })}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="540" w:bottom="720" w:left="540" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return createZip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      name: 'word/_rels/document.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    },
    {
      name: 'word/styles.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
</w:styles>`
    },
    { name: 'word/document.xml', data: documentXml }
  ]);
}

function toInteger(value, fallback = null) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function buildList(baseQuery, values, db, res) {
  db.all(baseQuery, values, (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  });
}

function buildPagedList({ db, res, fromSql, whereClause, values, orderBy, page, pageSize, includeDeletedAt = false }) {
  const countSql = `SELECT COUNT(*) AS total ${fromSql} ${whereClause}`;
  const dataSql = `
    SELECT
      Base.id,
      Base.order_number,
      Base.product_id,
      Products.name AS product_name,
      Products.code AS product_code,
      Products.type AS product_type,
      Products.unit AS product_unit,
      Products.manufacturer AS product_manufacturer,
      Base.amount,
      Base.done_qty,
      Base.amount - Base.done_qty AS remaining_qty,
      Base.start_date,
      Base.finish_date,
      Base.fact_date,
      Base.customer_id,
      Customers.name AS customer_name,
      Customers.short_name AS customer_short_name,
      Base.department_id,
      SourceDepartment.name AS department_name,
      Base.target_department_id,
      TargetDepartment.name AS target_department_name,
      Base.comments,
      Base.type_id,
      OrderTypes.name AS type_name,
      Base.status_id,
      Statuses.name AS status_name,
      Base.main_order,
      Base.status_change_date,
      Base.created_at,
      Base.updated_at,
      ${includeDeletedAt ? 'Base.deleted_at' : 'NULL AS deleted_at'}
      ${fromSql}
      ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  db.get(countSql, values, (countError, countRow) => {
    if (countError) {
      res.status(500).json({ error: countError.message });
      return;
    }

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const offset = (safePage - 1) * pageSize;

    db.all(dataSql, [...values, pageSize, offset], (dataError, rows) => {
      if (dataError) {
        res.status(500).json({ error: dataError.message });
        return;
      }

      res.json({
        items: rows,
        total,
        page: safePage,
        pageSize,
        totalPages
      });
    });
  });
}

function ensureDictionaryValue(db, table, name, extra = {}, callback) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    callback(null, null);
    return;
  }

  const extraColumns = Object.keys(extra);
  const columns = ['name', ...extraColumns];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [normalizedName, ...extraColumns.map((column) => extra[column])];

  db.run(
    `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values,
    (insertError) => {
      if (insertError) {
        callback(insertError);
        return;
      }

      db.get(`SELECT id FROM ${table} WHERE name = ?`, [normalizedName], (selectError, row) => {
        if (selectError) {
          callback(selectError);
          return;
        }

        callback(null, row ? row.id : null);
      });
    }
  );
}

function resolveCustomerId(db, payload, callback) {
  if (payload.customerId) {
    callback(null, payload.customerId);
    return;
  }

  ensureDictionaryValue(
    db,
    'Customers',
    payload.customerName,
    { is_internal: 0, is_active: 1 },
    callback
  );
}

function resolveProductId(db, payload, callback) {
  if (payload.productId) {
    callback(null, payload.productId);
    return;
  }

  ensureDictionaryValue(
    db,
    'Products',
    payload.productName,
    {
      type: payload.productType || 'Неклассифицированные / Без группы',
      unit: payload.productUnit || 'шт',
      manufacturer: payload.productManufacturer,
      comments: payload.productComments,
      is_active: 1
    },
    callback
  );
}

function getNextOrderNumber(db, callback) {
  db.get('SELECT COALESCE(MAX(order_number), 0) + 1 AS next_number FROM Orders', [], (error, row) => {
    if (error) {
      callback(error);
      return;
    }

    callback(null, Number(row.next_number || 1));
  });
}

function selectOrdersSql(whereClause = '', tableName = 'Orders') {
  const deletedAtSelection = tableName === 'DeletedOrders' ? 'Base.deleted_at' : 'NULL AS deleted_at';
  return `
    SELECT
      Base.id,
      Base.order_number,
      Base.product_id,
      Products.name AS product_name,
      Products.code AS product_code,
      Products.type AS product_type,
      Products.unit AS product_unit,
      Products.manufacturer AS product_manufacturer,
      Base.amount,
      Base.done_qty,
      Base.amount - Base.done_qty AS remaining_qty,
      Base.start_date,
      Base.finish_date,
      Base.fact_date,
      Base.customer_id,
      Customers.name AS customer_name,
      Customers.short_name AS customer_short_name,
      Base.department_id,
      SourceDepartment.name AS department_name,
      Base.target_department_id,
      TargetDepartment.name AS target_department_name,
      Base.comments,
      Base.type_id,
      OrderTypes.name AS type_name,
      Base.status_id,
      Statuses.name AS status_name,
      Base.main_order,
      Base.status_change_date,
      Base.created_at,
      Base.updated_at,
      ${deletedAtSelection}
    FROM ${tableName} AS Base
    LEFT JOIN Products ON Products.id = Base.product_id
    LEFT JOIN Customers ON Customers.id = Base.customer_id
    LEFT JOIN Departments AS SourceDepartment ON SourceDepartment.id = Base.department_id
    LEFT JOIN Departments AS TargetDepartment ON TargetDepartment.id = Base.target_department_id
    LEFT JOIN Statuses ON Statuses.id = Base.status_id
    LEFT JOIN OrderTypes ON OrderTypes.id = Base.type_id
    ${whereClause}
  `;
}

function buildOrderPayload(body) {
  return {
    productId: toInteger(body.product_id),
    productName: normalizeText(body.product || body.product_name || body.product_name_manual),
    productType: normalizeText(body.product_type),
    productUnit: normalizeText(body.product_unit),
    productManufacturer: normalizeText(body.product_manufacturer),
    productComments: normalizeText(body.product_comments),
    amount: Math.max(0, toInteger(body.amount, 1)),
    doneQty: Math.max(0, toInteger(body.done_qty, 0)),
    startDate: normalizeText(body.start_date),
    finishDate: normalizeText(body.finish_date),
    factDate: normalizeText(body.fact_date),
    customerId: toInteger(body.customer_id),
    customerName: normalizeText(body.customer || body.customer_name),
    departmentId: toInteger(body.department_id),
    targetDepartmentId: toInteger(body.target_department_id),
    comments: normalizeText(body.comments) || '',
    typeId: toInteger(body.type_id, 1),
    statusId: toInteger(body.status_id, 1),
    mainOrder: toInteger(body.main_order)
  };
}

function buildFilters(query, tableName = 'Orders') {
  const clauses = [];
  const values = [];

  if (query.date_from) {
    clauses.push(`${tableName}.finish_date >= ?`);
    values.push(query.date_from);
  }

  if (query.date_to) {
    clauses.push(`${tableName}.finish_date <= ?`);
    values.push(query.date_to);
  }

  if (query.customer_id) {
    clauses.push(`${tableName}.customer_id = ?`);
    values.push(query.customer_id);
  }

  if (query.product_id) {
    clauses.push(`${tableName}.product_id = ?`);
    values.push(query.product_id);
  }

  if (query.status_ids) {
    const statusIds = String(query.status_ids)
      .split(',')
      .map((value) => toInteger(value))
      .filter(Boolean);

    if (statusIds.length) {
      clauses.push(`${tableName}.status_id IN (${statusIds.map(() => '?').join(', ')})`);
      values.push(...statusIds);
    }
  }

  if (query.exclude_status_ids) {
    const excludedIds = String(query.exclude_status_ids)
      .split(',')
      .map((value) => toInteger(value))
      .filter(Boolean);

    if (excludedIds.length) {
      clauses.push(`${tableName}.status_id NOT IN (${excludedIds.map(() => '?').join(', ')})`);
      values.push(...excludedIds);
    }
  }

  if (query.search) {
    clauses.push(`(
      Products.name LIKE ?
      OR Products.code LIKE ?
      OR Customers.name LIKE ?
      OR ${tableName}.comments LIKE ?
      OR CAST(${tableName}.order_number AS TEXT) LIKE ?
    )`);
    const searchValue = `%${query.search}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

function getPaging(query, defaultPageSize = 50) {
  const page = Math.max(1, toInteger(query.page, 1) || 1);
  const pageSize = Math.min(200, Math.max(10, toInteger(query.page_size, defaultPageSize) || defaultPageSize));
  return { page, pageSize };
}

function getOrderBy(query, fallback = 'date_asc') {
  const direction = String(query.sort_order || '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const sortBy = String(query.sort_by || fallback);

  if (sortBy === 'number') {
    return `Base.order_number ${direction}, Base.finish_date IS NULL, Base.finish_date ${direction}`;
  }

  if (sortBy === 'date_desc') {
    return 'Base.finish_date IS NULL, Base.finish_date DESC, Base.order_number DESC';
  }

  if (sortBy === 'number_desc') {
    return 'Base.order_number DESC, Base.finish_date IS NULL, Base.finish_date DESC';
  }

  return 'Base.finish_date IS NULL, Base.finish_date ASC, Base.order_number ASC';
}

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const filter = buildFilters(req.query);
  const paging = getPaging(req.query, 50);
  buildPagedList({
    db,
    res,
    fromSql: `
      FROM Orders AS Base
      LEFT JOIN Products ON Products.id = Base.product_id
      LEFT JOIN Customers ON Customers.id = Base.customer_id
      LEFT JOIN Departments AS SourceDepartment ON SourceDepartment.id = Base.department_id
      LEFT JOIN Departments AS TargetDepartment ON TargetDepartment.id = Base.target_department_id
      LEFT JOIN Statuses ON Statuses.id = Base.status_id
      LEFT JOIN OrderTypes ON OrderTypes.id = Base.type_id
    `,
    whereClause: filter.clause.replaceAll('Orders.', 'Base.'),
    values: filter.values,
    orderBy: getOrderBy(req.query),
    page: paging.page,
    pageSize: paging.pageSize
  });
});

router.get('/plan', (req, res) => {
  const db = req.app.locals.db;
  const filter = buildFilters(req.query);
  const paging = getPaging(req.query, 50);
  buildPagedList({
    db,
    res,
    fromSql: `
      FROM Orders AS Base
      LEFT JOIN Products ON Products.id = Base.product_id
      LEFT JOIN Customers ON Customers.id = Base.customer_id
      LEFT JOIN Departments AS SourceDepartment ON SourceDepartment.id = Base.department_id
      LEFT JOIN Departments AS TargetDepartment ON TargetDepartment.id = Base.target_department_id
      LEFT JOIN Statuses ON Statuses.id = Base.status_id
      LEFT JOIN OrderTypes ON OrderTypes.id = Base.type_id
    `,
    whereClause: filter.clause.replaceAll('Orders.', 'Base.'),
    values: filter.values,
    orderBy: getOrderBy(req.query),
    page: paging.page,
    pageSize: paging.pageSize
  });
});

router.get('/plan/export', (req, res) => {
  const db = req.app.locals.db;
  const filter = buildFilters(req.query);
  const selectedOrderIds = String(req.query.order_ids || '')
    .split(',')
    .map((value) => toInteger(value))
    .filter(Boolean);
  const exportFilter = {
    clause: filter.clause.replaceAll('Orders.', 'Base.'),
    values: [...filter.values]
  };

  if (selectedOrderIds.length) {
    const selectedClause = `Base.id IN (${selectedOrderIds.map(() => '?').join(', ')})`;
    exportFilter.clause = exportFilter.clause
      ? `${exportFilter.clause} AND ${selectedClause}`
      : `WHERE ${selectedClause}`;
    exportFilter.values.push(...selectedOrderIds);
  }
  const sql = `
    SELECT
      Base.id,
      Base.order_number,
      Base.product_id,
      Products.name AS product_name,
      Products.code AS product_code,
      Base.amount,
      Base.done_qty,
      Base.amount - Base.done_qty AS remaining_qty,
      Base.finish_date,
      Base.customer_id,
      Customers.name AS customer_name,
      Base.department_id,
      SourceDepartment.name AS department_name,
      Base.status_id,
      Statuses.name AS status_name
    FROM Orders AS Base
    LEFT JOIN Products ON Products.id = Base.product_id
    LEFT JOIN Customers ON Customers.id = Base.customer_id
    LEFT JOIN Departments AS SourceDepartment ON SourceDepartment.id = Base.department_id
    LEFT JOIN Statuses ON Statuses.id = Base.status_id
    ${exportFilter.clause}
    ORDER BY ${getOrderBy(req.query)}
  `;

  db.all(sql, exportFilter.values, (error, rows) => {
    if (error) return res.status(500).json({ error: error.message });

    const statusNames = [...new Set(rows.map((row) => row.status_name).filter(Boolean))];
    const meta = {
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      customerName: rows.find((row) => String(row.customer_id) === String(req.query.customer_id))?.customer_name,
      productName: rows.find((row) => String(row.product_id) === String(req.query.product_id))?.product_name,
      statusNames: req.query.status_ids ? statusNames : []
    };
    const docx = buildPlanDocx(rows, meta);
    const fileName = encodeURIComponent(`plan-${new Date().toISOString().slice(0, 10)}.docx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send(docx);
  });
});

router.get('/archive', (req, res) => {
  const db = req.app.locals.db;
  const filter = buildFilters(req.query, 'DeletedOrders');
  const paging = getPaging(req.query, 50);
  buildPagedList({
    db,
    res,
    fromSql: `
      FROM DeletedOrders AS Base
      LEFT JOIN Products ON Products.id = Base.product_id
      LEFT JOIN Customers ON Customers.id = Base.customer_id
      LEFT JOIN Departments AS SourceDepartment ON SourceDepartment.id = Base.department_id
      LEFT JOIN Departments AS TargetDepartment ON TargetDepartment.id = Base.target_department_id
      LEFT JOIN Statuses ON Statuses.id = Base.status_id
      LEFT JOIN OrderTypes ON OrderTypes.id = Base.type_id
    `,
    whereClause: filter.clause.replaceAll('DeletedOrders.', 'Base.'),
    values: filter.values,
    orderBy: 'Base.deleted_at DESC, Base.order_number DESC',
    page: paging.page,
    pageSize: paging.pageSize,
    includeDeletedAt: true
  });
});

router.post('/archive/:archiveId/restore', (req, res) => {
  const db = req.app.locals.db;
  const archiveId = toInteger(req.params.archiveId);

  db.get('SELECT * FROM DeletedOrders WHERE id = ?', [archiveId], (error, row) => {
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'Архивная запись не найдена' });

    db.run(
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
          producer_id,
          responsible_id,
          comments,
          type_id,
          status_id,
          main_order,
          status_change_date,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        row.order_number,
        row.product_id,
        row.amount,
        row.done_qty,
        row.start_date,
        row.finish_date,
        row.fact_date,
        row.customer_id,
        row.department_id,
        row.target_department_id,
        row.producer_id,
        row.responsible_id,
        row.comments,
        row.type_id,
        row.status_id,
        row.main_order,
        row.status_change_date,
        row.created_at
      ],
      function restoreOrder(insertError) {
        if (insertError) return res.status(500).json({ error: insertError.message });

        db.run('DELETE FROM DeletedOrders WHERE id = ?', [archiveId], (deleteError) => {
          if (deleteError) return res.status(500).json({ error: deleteError.message });
          res.json({ id: this.lastID });
        });
      }
    );
  });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const sql = `${selectOrdersSql('WHERE Base.id = ?')} LIMIT 1`;

  db.get(sql, [req.params.id], (error, row) => {
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const payload = buildOrderPayload(req.body);

  if (!payload.productId && !payload.productName) {
    return res.status(400).json({ error: 'Изделие обязательно' });
  }

  db.serialize(() => {
    getNextOrderNumber(db, (numberError, orderNumber) => {
      if (numberError) return res.status(500).json({ error: numberError.message });

      resolveProductId(db, payload, (productError, productId) => {
        if (productError) return res.status(500).json({ error: productError.message });

        resolveCustomerId(db, payload, (customerError, customerId) => {
          if (customerError) return res.status(500).json({ error: customerError.message });

          const sql = `
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
            VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;

          db.run(
            sql,
            [
              orderNumber,
              productId,
              payload.amount,
              Math.min(payload.doneQty, payload.amount),
              payload.startDate,
              payload.finishDate,
              payload.factDate,
              customerId,
              payload.departmentId,
              payload.targetDepartmentId,
              payload.comments,
              payload.typeId,
              payload.statusId,
              payload.mainOrder
            ],
            function insertOrder(insertError) {
              if (insertError) return res.status(500).json({ error: insertError.message });
              res.status(201).json({ id: this.lastID, order_number: orderNumber });
            }
          );
        });
      });
    });
  });
});

router.post('/:id/duplicate', (req, res) => {
  const db = req.app.locals.db;

  db.get('SELECT * FROM Orders WHERE id = ?', [req.params.id], (error, row) => {
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'Заказ не найден' });

    const body = { ...row, ...req.body };
    const payload = buildOrderPayload(body);

    db.serialize(() => {
      getNextOrderNumber(db, (numberError, orderNumber) => {
        if (numberError) return res.status(500).json({ error: numberError.message });

        resolveProductId(db, payload, (productError, productId) => {
          if (productError) return res.status(500).json({ error: productError.message });

          resolveCustomerId(db, payload, (customerError, customerId) => {
            if (customerError) return res.status(500).json({ error: customerError.message });

            db.run(
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
                VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `,
              [
                orderNumber,
                productId,
                payload.amount,
                Math.min(payload.doneQty, payload.amount),
                payload.startDate,
                payload.finishDate,
                payload.factDate,
                customerId,
                payload.departmentId,
                payload.targetDepartmentId,
                payload.comments,
                payload.typeId,
                payload.statusId,
                payload.mainOrder
              ],
              function insertCopy(insertError) {
                if (insertError) return res.status(500).json({ error: insertError.message });
                res.status(201).json({ id: this.lastID, order_number: orderNumber });
              }
            );
          });
        });
      });
    });
  });
});

router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const payload = buildOrderPayload(req.body);

  if (!payload.productId && !payload.productName) {
    return res.status(400).json({ error: 'Изделие обязательно' });
  }

  db.serialize(() => {
    resolveProductId(db, payload, (productError, productId) => {
      if (productError) return res.status(500).json({ error: productError.message });

      resolveCustomerId(db, payload, (customerError, customerId) => {
        if (customerError) return res.status(500).json({ error: customerError.message });

        const sql = `
          UPDATE Orders
          SET
            product_id = ?,
            amount = ?,
            done_qty = ?,
            start_date = COALESCE(?, start_date),
            finish_date = ?,
            fact_date = ?,
            customer_id = ?,
            department_id = ?,
            target_department_id = ?,
            comments = ?,
            type_id = ?,
            status_id = ?,
            main_order = ?,
            status_change_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        db.run(
          sql,
          [
            productId,
            payload.amount,
            Math.min(payload.doneQty, payload.amount),
            payload.startDate,
            payload.finishDate,
            payload.factDate,
            customerId,
            payload.departmentId,
            payload.targetDepartmentId,
            payload.comments,
            payload.typeId,
            payload.statusId,
            payload.mainOrder,
            req.params.id
          ],
          function updateOrder(updateError) {
            if (updateError) return res.status(500).json({ error: updateError.message });
            if (!this.changes) return res.status(404).json({ error: 'Заказ не найден' });
            res.json({ id: Number(req.params.id) });
          }
        );
      });
    });
  });
});

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const orderId = toInteger(req.params.id);

  db.get('SELECT * FROM Orders WHERE id = ?', [orderId], (error, row) => {
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'Заказ не найден' });

    const snapshot = JSON.stringify(row);

    db.serialize(() => {
      db.run(
        `
          INSERT INTO DeletedOrders (
            original_order_id,
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
            producer_id,
            responsible_id,
            comments,
            type_id,
            status_id,
            main_order,
            status_change_date,
            created_at,
            updated_at,
            deleted_at,
            snapshot_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `,
        [
          row.id,
          row.order_number,
          row.product_id,
          row.amount,
          row.done_qty,
          row.start_date,
          row.finish_date,
          row.fact_date,
          row.customer_id,
          row.department_id,
          row.target_department_id,
          row.producer_id,
          row.responsible_id,
          row.comments,
          row.type_id,
          row.status_id,
          row.main_order,
          row.status_change_date,
          row.created_at,
          row.updated_at,
          snapshot
        ],
        (archiveError) => {
          if (archiveError) return res.status(500).json({ error: archiveError.message });

          db.run('DELETE FROM Orders WHERE id = ?', [orderId], function deleteOrder(deleteError) {
            if (deleteError) return res.status(500).json({ error: deleteError.message });
            res.json({ id: orderId, archived: true });
          });
        }
      );
    });
  });
});

module.exports = router;
