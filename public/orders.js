const orderForm = document.getElementById('orderForm');
const orderFormSection = document.getElementById('orderFormSection');
const showFormButton = document.getElementById('showFormButton');
const closeFormButton = document.getElementById('closeFormButton');
const resetFormButton = document.getElementById('resetFormButton');
const refreshButton = document.getElementById('refreshButton');

const moduleLinks = [...document.querySelectorAll('[data-module-link]')];

const ordersTabPanel = document.getElementById('ordersTabPanel');
const planTabPanel = document.getElementById('planTabPanel');
const archiveTabPanel = document.getElementById('archiveTabPanel');
const customersTabPanel = document.getElementById('customersTabPanel');
const productsTabPanel = document.getElementById('productsTabPanel');
const stockTabPanel = document.getElementById('stockTabPanel');

const tableBody = document.getElementById('ordersTableBody');
const planOrdersTableBody = document.getElementById('planOrdersTableBody');
const archiveTableBody = document.getElementById('archiveTableBody');
const orderDetailsCard = document.getElementById('orderDetailsCard');
const orderDetailsBackdrop = document.getElementById('orderDetailsBackdrop');
const closeDetailsButton = document.getElementById('closeDetailsButton');
const detailsForm = document.getElementById('detailsForm');
const detailsTitle = document.getElementById('detailsTitle');
const detailOrderNumber = document.getElementById('detailOrderNumber');
const detailRemainingQty = document.getElementById('detailRemainingQty');
const saveState = document.getElementById('saveState');
const duplicateOrderButton = document.getElementById('duplicateOrderButton');
const deleteOrderButton = document.getElementById('deleteOrderButton');
const reloadDetailsButton = document.getElementById('reloadDetailsButton');

const orderSearchInput = document.getElementById('orderSearchInput');
const orderDateFromInput = document.getElementById('orderDateFromInput');
const orderDateToInput = document.getElementById('orderDateToInput');
const orderCustomerFilter = document.getElementById('orderCustomerFilter');
const orderProductFilter = document.getElementById('orderProductFilter');
const orderStatusFilterList = document.getElementById('orderStatusFilterList');
const clearOrderFiltersButton = document.getElementById('clearOrderFiltersButton');
const ordersResultCount = document.getElementById('ordersResultCount');
const ordersPagination = document.getElementById('ordersPagination');

const planDateFromInput = document.getElementById('planDateFromInput');
const planDateToInput = document.getElementById('planDateToInput');
const planCustomerFilter = document.getElementById('planCustomerFilter');
const planProductFilter = document.getElementById('planProductFilter');
const planStatusFilterList = document.getElementById('planStatusFilterList');
const printPlanButton = document.getElementById('printPlanButton');
const syncPlanFiltersButton = document.getElementById('syncPlanFiltersButton');
const planSelectionCount = document.getElementById('planSelectionCount');
const clearPlanSelectionButton = document.getElementById('clearPlanSelectionButton');
const togglePlanSelectionCheckbox = document.getElementById('togglePlanSelectionCheckbox');
const planPagination = document.getElementById('planPagination');
const archivePagination = document.getElementById('archivePagination');

const addDepartmentButton = document.getElementById('addDepartmentButton');
const addDepartmentDetailsButton = document.getElementById('addDepartmentDetailsButton');
const addTypeButton = document.getElementById('addTypeButton');
const addTypeDetailsButton = document.getElementById('addTypeDetailsButton');
const productTypeSuggestions = document.getElementById('productTypeSuggestions');

const ordersCount = document.getElementById('ordersCount');
const activeOrdersCount = document.getElementById('activeOrdersCount');
const customersCount = document.getElementById('customersCount');
const productsCount = document.getElementById('productsCount');
const plannedTotalCount = document.getElementById('plannedTotalCount');
const freeStockTotalCount = document.getElementById('freeStockTotalCount');

const customerSearchInput = document.getElementById('customerSearchInput');
const customersTableBody = document.getElementById('customersTableBody');
const customerForm = document.getElementById('customerForm');
const customerFormTitle = document.getElementById('customerFormTitle');
const customerSaveState = document.getElementById('customerSaveState');
const newCustomerButton = document.getElementById('newCustomerButton');
const resetCustomerFormButton = document.getElementById('resetCustomerFormButton');

const productSearchInput = document.getElementById('productSearchInput');
const productsTableBody = document.getElementById('productsTableBody');
const productForm = document.getElementById('productForm');
const productFormTitle = document.getElementById('productFormTitle');
const productSaveState = document.getElementById('productSaveState');
const newProductButton = document.getElementById('newProductButton');
const resetProductFormButton = document.getElementById('resetProductFormButton');

const stockSearchInput = document.getElementById('stockSearchInput');
const stockTableBody = document.getElementById('stockTableBody');
const emptyStockDetails = document.getElementById('emptyStockDetails');
const stockForm = document.getElementById('stockForm');
const stockTitle = document.getElementById('stockTitle');
const stockSaveState = document.getElementById('stockSaveState');
const reloadStockButton = document.getElementById('reloadStockButton');
const openStockProductButton = document.getElementById('openStockProductButton');
const stockAvailableValue = document.getElementById('stockAvailableValue');
const stockReservedValue = document.getElementById('stockReservedValue');
const stockFreeValue = document.getElementById('stockFreeValue');
const newMovementButton = document.getElementById('newMovementButton');
const stockMovementPanel = document.getElementById('stockMovementPanel');
const movementForm = document.getElementById('movementForm');
const movementTypeSelect = document.getElementById('movementTypeSelect');
const movementSenderSelect = document.getElementById('movementSenderSelect');
const movementReceiverSelect = document.getElementById('movementReceiverSelect');
const movementCustomerSelect = document.getElementById('movementCustomerSelect');
const cancelMovementButton = document.getElementById('cancelMovementButton');
const stockBalancesTableBody = document.getElementById('stockBalancesTableBody');
const movementHistoryTableBody = document.getElementById('movementHistoryTableBody');
const departmentsTableBody = document.getElementById('departmentsTableBody');
const newDepartmentDirectoryButton = document.getElementById('newDepartmentDirectoryButton');

let orders = [];
let archivedOrders = [];
let planOrders = [];
let customers = [];
let products = [];
let metrics = [];
let inventorySummary = [];
let movementTypes = [];
let selectedStockDetails = null;
let statuses = [];
let types = [];
let departments = [];
let selectedOrderId = null;
let selectedCustomerId = null;
let selectedProductId = null;
let selectedStockProductId = null;
let customerSearchQuery = '';
let productSearchQuery = '';
let stockSearchQuery = '';
let orderSearchTimer = null;
let orderFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  customerId: '',
  productId: '',
  statusIds: []
};
let planFilters = {
  dateFrom: '',
  dateTo: '',
  customerId: '',
  productId: '',
  statusIds: []
};
const selectedPlanOrderIds = new Set();
let ordersPager = { total: 0, page: 1, pageSize: 50, totalPages: 1 };
let planPager = { total: 0, page: 1, pageSize: 50, totalPages: 1 };
let archivePager = { total: 0, page: 1, pageSize: 50, totalPages: 1 };
let activeTab = 'orders';
const loadedTabs = {
  orders: false,
  plan: false,
  archive: false,
  customers: false,
  products: false,
  stock: false
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatValue(value) {
  return value || '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

function formatOrderNumber(value) {
  return value ? `№ ${String(value).padStart(4, '0')}` : '—';
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRemainingQty(order) {
  return Math.max(0, toNumber(order.amount) - toNumber(order.done_qty));
}

function normalizeStatusName(value) {
  return String(value || '').trim().toLowerCase();
}

function getStatusTone(statusName) {
  const normalized = normalizeStatusName(statusName);

  if (normalized.includes('отгруж')) return 'done';
  if (normalized.includes('готов')) return 'done';
  if (normalized.includes('брак') || normalized.includes('отмен')) return 'danger';
  if (normalized.includes('запуск') || normalized.includes('соглас')) return 'warning';
  if (normalized.includes('работ')) return 'progress';
  if (normalized.includes('нов')) return 'new';
  return 'neutral';
}

function getDueState(order) {
  if (!order.finish_date) return { tone: 'empty', label: 'Срок не указан' };
  if (order.fact_date) return { tone: 'done', label: `Закрыт ${formatDate(order.fact_date)}` };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finishDate = new Date(order.finish_date);

  if (Number.isNaN(finishDate.getTime())) {
    return { tone: 'neutral', label: order.finish_date };
  }

  finishDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((finishDate - today) / 86400000);

  if (diffDays < 0) {
    return { tone: 'danger', label: `Просрочен на ${Math.abs(diffDays)} дн.` };
  }
  if (diffDays === 0) {
    return { tone: 'warning', label: 'Срок сегодня' };
  }
  if (diffDays <= 3) {
    return { tone: 'warning', label: `Срок через ${diffDays} дн.` };
  }

  return { tone: 'neutral', label: formatDate(order.finish_date) };
}

function setBadgeText(element, text, mode = '') {
  element.textContent = text;
  element.dataset.mode = mode;
}

function setSaveState(text, mode = '') {
  setBadgeText(saveState, text, mode);
}

function setCustomerSaveState(text, mode = '') {
  setBadgeText(customerSaveState, text, mode);
}

function setProductSaveState(text, mode = '') {
  setBadgeText(productSaveState, text, mode);
}

function setStockSaveState(text, mode = '') {
  setBadgeText(stockSaveState, text, mode);
}

function activateTab(tabName) {
  activeTab = tabName;
  const tabs = [
    ['orders', ordersTabPanel],
    ['plan', planTabPanel],
    ['archive', archiveTabPanel],
    ['customers', customersTabPanel],
    ['products', productsTabPanel],
    ['stock', stockTabPanel]
  ];

  tabs.forEach(([name, panel]) => {
    const active = name === tabName;
    panel.classList.toggle('hidden', !active);
  });

  moduleLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });
}

function setFormValue(form, name, value) {
  const field = form.elements[name];
  if (!field) return;

  if (field.type === 'checkbox') {
    field.checked = Boolean(Number(value)) || value === true;
    return;
  }

  field.value = value ?? '';
}

function clearOrderDetails() {
  selectedOrderId = null;
  orderDetailsCard.classList.add('hidden');
  orderDetailsBackdrop.classList.add('hidden');
  detailsForm.classList.add('hidden');
  renderOrders();
}

function resetCreateForm() {
  orderForm.reset();
  orderForm.elements.amount.value = 1;
  orderForm.elements.done_qty.value = 0;
  setDefaultSelects(orderForm);
}

function resetCustomerForm() {
  selectedCustomerId = null;
  customerForm.reset();
  customerFormTitle.textContent = 'Новый заказчик';
  customerForm.elements.id.value = '';
  customerForm.elements.is_active.checked = true;
  customerForm.elements.is_internal.checked = false;
  setCustomerSaveState('Готово к вводу');
  renderCustomers();
}

function resetProductForm() {
  selectedProductId = null;
  productForm.reset();
  productFormTitle.textContent = 'Новое изделие';
  productForm.elements.id.value = '';
  productForm.elements.is_active.checked = true;
  setProductSaveState('Готово к вводу');
  renderProducts();
}

function setDefaultSelects(form) {
  if (form.elements.status_id && statuses[0]) {
    form.elements.status_id.value = String(statuses[0].id);
  }

  if (form.elements.type_id && types[0]) {
    form.elements.type_id.value = String(types[0].id);
  }

  if (form.elements.customer_id) {
    const activeCustomer = customers.find((customer) => customer.is_active);
    form.elements.customer_id.value = activeCustomer ? String(activeCustomer.id) : '';
  }

  if (form.elements.product_id) {
    form.elements.product_id.value = '';
  }

  if (form.elements.department_id) {
    form.elements.department_id.value = departments[0] ? String(departments[0].id) : '';
  }

  if (form.elements.target_department_id) {
    form.elements.target_department_id.value = departments[1]
      ? String(departments[1].id)
      : departments[0]
        ? String(departments[0].id)
        : '';
  }
}

function fillSelects() {
  const statusOptions = statuses
    .map((status) => `<option value="${status.id}">${escapeHtml(status.name)}</option>`)
    .join('');
  const typeOptions = types
    .map((type) => `<option value="${type.id}">${escapeHtml(type.name)}</option>`)
    .join('');
  const customerOptions = [
    '<option value="">Выберите заказчика</option>',
    ...customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`)
  ].join('');
  const productOptions = [
    '<option value="">Выберите изделие</option>',
    ...products.map((product) => {
      const meta = [product.code, product.type].filter(Boolean).join(' • ');
      return `<option value="${product.id}">${escapeHtml(product.name)}${meta ? ` — ${escapeHtml(meta)}` : ''}</option>`;
    })
  ].join('');
  const departmentOptions = [
    '<option value="">Не выбран</option>',
    ...departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
  ].join('');

  document.querySelectorAll('[data-statuses-select]').forEach((select) => {
    select.innerHTML = statusOptions;
  });
  document.querySelectorAll('[data-types-select]').forEach((select) => {
    select.innerHTML = typeOptions;
  });
  document.querySelectorAll('[data-customers-select]').forEach((select) => {
    select.innerHTML = customerOptions;
  });
  document.querySelectorAll('[data-products-select]').forEach((select) => {
    select.innerHTML = productOptions;
  });
  document.querySelectorAll('[data-departments-select]').forEach((select) => {
    select.innerHTML = departmentOptions;
  });
  if (movementSenderSelect && movementReceiverSelect) {
    movementSenderSelect.innerHTML = departmentOptions;
    movementReceiverSelect.innerHTML = departmentOptions;
  }
  if (movementCustomerSelect) {
    movementCustomerSelect.innerHTML = customerOptions;
  }

  orderCustomerFilter.innerHTML = ['<option value="">Все заказчики</option>', ...customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`)].join('');
  orderProductFilter.innerHTML = ['<option value="">Все изделия</option>', ...products.map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)].join('');
  planCustomerFilter.innerHTML = orderCustomerFilter.innerHTML;
  planProductFilter.innerHTML = orderProductFilter.innerHTML;

  orderCustomerFilter.value = orderFilters.customerId;
  orderProductFilter.value = orderFilters.productId;
  planCustomerFilter.value = planFilters.customerId;
  planProductFilter.value = planFilters.productId;
}

function fillMovementSelects() {
  if (!movementTypeSelect) return;
  movementTypeSelect.innerHTML = movementTypes
    .map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.name)}</option>`)
    .join('');
}

function fillStatusFilters() {
  const render = (container, selectedIds, prefix) => {
    container.innerHTML = statuses
      .map((status) => `
        <label class="status-choice">
          <input type="checkbox" data-filter-prefix="${prefix}" value="${status.id}" ${selectedIds.includes(status.id) ? 'checked' : ''}>
          <span>${escapeHtml(status.name)}</span>
        </label>
      `)
      .join('');
  };

  render(orderStatusFilterList, orderFilters.statusIds, 'order');
  render(planStatusFilterList, planFilters.statusIds, 'plan');
}

function fillProductTypeSuggestions() {
  const uniqueTypes = [...new Set(products.map((product) => product.type).filter(Boolean))].sort();
  productTypeSuggestions.innerHTML = uniqueTypes
    .map((type) => `<option value="${escapeHtml(type)}"></option>`)
    .join('');
}

function formatRecordCount(count) {
  return `${count} ${count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей'}`;
}

function updateTopMetrics() {
  ordersCount.textContent = ordersPager.total;
  activeOrdersCount.textContent = orders.filter((order) => ['new', 'progress', 'warning'].includes(getStatusTone(order.status_name))).length;
  customersCount.textContent = customers.length;
  productsCount.textContent = products.length;
  plannedTotalCount.textContent = orders.reduce((sum, order) => sum + toNumber(order.amount), 0);
  freeStockTotalCount.textContent = metrics.reduce((sum, item) => sum + toNumber(item.free_qty), 0);
}

function updatePlanSelectionState() {
  const selectedCount = selectedPlanOrderIds.size;
  if (planSelectionCount) {
    planSelectionCount.textContent = selectedCount
      ? `В Word уйдет отмеченных строк: ${selectedCount}`
      : 'Если ничего не отмечено, в Word уйдут все строки по фильтру';
  }

  if (togglePlanSelectionCheckbox) {
    const pageIds = planOrders.map((order) => order.id);
    const selectedOnPage = pageIds.filter((id) => selectedPlanOrderIds.has(id)).length;
    togglePlanSelectionCheckbox.checked = pageIds.length > 0 && selectedOnPage === pageIds.length;
    togglePlanSelectionCheckbox.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
  }
}

function clearPlanSelection() {
  selectedPlanOrderIds.clear();
  updatePlanSelectionState();
}

function buildQuery(filters, pager = null) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.customerId) params.set('customer_id', filters.customerId);
  if (filters.productId) params.set('product_id', filters.productId);
  if (Array.isArray(filters.statusIds) && filters.statusIds.length) {
    params.set('status_ids', filters.statusIds.join(','));
  }
  if (pager) {
    params.set('page', pager.page);
    params.set('page_size', pager.pageSize);
  }
  return params.toString();
}

async function fetchPagedCollection(url, filters, pager) {
  const query = buildQuery(filters, pager);
  const response = await fetch(`${url}${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error('Не удалось загрузить данные');
  }
  return response.json();
}

function renderPagination(container, pager, onChange) {
  if (!pager.total || pager.totalPages <= 1) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const from = (pager.page - 1) * pager.pageSize + 1;
  const to = Math.min(pager.page * pager.pageSize, pager.total);

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="pagination-summary">Показаны записи ${from}-${to} из ${pager.total}</div>
    <div class="pagination-actions">
      <button class="secondary-button pagination-button" type="button" data-page="1" ${pager.page === 1 ? 'disabled' : ''}>«</button>
      <button class="secondary-button pagination-button" type="button" data-page="${pager.page - 1}" ${pager.page === 1 ? 'disabled' : ''}>‹</button>
      <span class="result-badge">Страница ${pager.page} из ${pager.totalPages}</span>
      <button class="secondary-button pagination-button" type="button" data-page="${pager.page + 1}" ${pager.page >= pager.totalPages ? 'disabled' : ''}>›</button>
      <button class="secondary-button pagination-button" type="button" data-page="${pager.totalPages}" ${pager.page >= pager.totalPages ? 'disabled' : ''}>»</button>
    </div>
  `;

  container.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => onChange(Number(button.dataset.page)));
  });
}

async function loadOrders(page = ordersPager.page) {
  ordersPager.page = page;
  const data = await fetchPagedCollection('/api/orders', orderFilters, ordersPager);
  orders = data.items;
  ordersPager = {
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages
  };
  loadedTabs.orders = true;
  renderOrders();
  updateTopMetrics();
}

async function loadPlanOrders(page = planPager.page) {
  planPager.page = page;
  const data = await fetchPagedCollection('/api/orders/plan', planFilters, planPager);
  planOrders = data.items;
  planPager = {
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages
  };
  loadedTabs.plan = true;
  renderPlanOrders();
}

async function loadArchive(page = archivePager.page) {
  archivePager.page = page;
  const data = await fetchPagedCollection('/api/orders/archive', {}, archivePager);
  archivedOrders = data.items;
  archivePager = {
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages
  };
  loadedTabs.archive = true;
  renderArchive();
}

async function loadCustomers() {
  const response = await fetch('/api/customers');
  if (!response.ok) throw new Error('Не удалось загрузить заказчиков');
  customers = await response.json();
  loadedTabs.customers = true;
  fillSelects();
  setDefaultSelects(orderForm);
  renderCustomers();
  updateTopMetrics();
}

async function loadProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Не удалось загрузить изделия');
  products = await response.json();
  loadedTabs.products = true;
  fillSelects();
  fillProductTypeSuggestions();
  setDefaultSelects(orderForm);
  renderProducts();
  updateTopMetrics();
}

async function loadMetrics() {
  const [metricsResponse, inventoryResponse, movementTypesResponse] = await Promise.all([
    fetch('/api/product-metrics'),
    fetch('/api/inventory'),
    fetch('/api/inventory/movement-types')
  ]);
  if (!metricsResponse.ok || !inventoryResponse.ok || !movementTypesResponse.ok) {
    throw new Error('Не удалось загрузить складские данные');
  }
  metrics = await metricsResponse.json();
  inventorySummary = await inventoryResponse.json();
  movementTypes = await movementTypesResponse.json();
  loadedTabs.stock = true;
  fillMovementSelects();
  renderStock();
  updateTopMetrics();
}

async function loadDictionaries() {
  const [statusesResponse, typesResponse, departmentsResponse] = await Promise.all([
    fetch('/api/statuses'),
    fetch('/api/types'),
    fetch('/api/departments')
  ]);

  statuses = await statusesResponse.json();
  types = await typesResponse.json();
  departments = await departmentsResponse.json();

  fillSelects();
  fillStatusFilters();
  renderDepartmentsDirectory();
}

async function ensureTabDataLoaded(tabName, force = false) {
  if (tabName === 'orders' && (force || !loadedTabs.orders)) {
    await loadOrders(force ? 1 : ordersPager.page);
    return;
  }

  if (tabName === 'plan' && (force || !loadedTabs.plan)) {
    await loadPlanOrders(force ? 1 : planPager.page);
    return;
  }

  if (tabName === 'archive' && (force || !loadedTabs.archive)) {
    await loadArchive(force ? 1 : archivePager.page);
    return;
  }

  if (tabName === 'customers' && (force || !loadedTabs.customers)) {
    await loadCustomers();
    return;
  }

  if (tabName === 'products' && (force || !loadedTabs.products)) {
    await loadProducts();
    return;
  }

  if (tabName === 'stock' && (force || !loadedTabs.stock)) {
    await loadMetrics();
  }
}

async function refreshActiveTab() {
  await ensureTabDataLoaded(activeTab, true);
}

function getFilteredCustomers() {
  const query = customerSearchQuery.trim().toLowerCase();
  return customers.filter((customer) => {
    if (!query) return true;
    return [customer.name, customer.short_name, customer.city, customer.contact_person, customer.phone, customer.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

function renderCustomers() {
  const filteredCustomers = getFilteredCustomers();

  if (!filteredCustomers.length) {
    customersTableBody.innerHTML = '<tr><td class="empty-state" colspan="5">По заданным условиям заказчики не найдены.</td></tr>';
    return;
  }

  customersTableBody.innerHTML = filteredCustomers
    .map((customer) => `
      <tr class="${customer.id === selectedCustomerId ? 'selected-row' : ''}" data-customer-id="${customer.id}">
        <td><strong>${escapeHtml(customer.name)}</strong>${customer.short_name ? `<small>${escapeHtml(customer.short_name)}</small>` : ''}</td>
        <td>${customer.is_internal ? 'Внутренний' : 'Внешний'}</td>
        <td>${escapeHtml(formatValue(customer.city))}</td>
        <td>${customer.orders_count}</td>
        <td><span class="status ${customer.is_active ? 'status-new' : 'status-muted'}">${customer.is_active ? 'Активный' : 'Неактивный'}</span></td>
      </tr>
    `)
    .join('');
}

function getFilteredProducts() {
  const query = productSearchQuery.trim().toLowerCase();
  return products.filter((product) => {
    if (!query) return true;
    return [product.name, product.code, product.type, product.manufacturer, product.unit]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();

  if (!filteredProducts.length) {
    productsTableBody.innerHTML = '<tr><td class="empty-state" colspan="5">По заданным условиям изделия не найдены.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = filteredProducts
    .map((product) => `
      <tr class="${product.id === selectedProductId ? 'selected-row' : ''}" data-product-id="${product.id}">
        <td><strong>${escapeHtml(product.name)}</strong>${product.manufacturer ? `<small>${escapeHtml(product.manufacturer)}</small>` : ''}</td>
        <td>${escapeHtml(formatValue(product.code))}</td>
        <td>${escapeHtml(formatValue(product.type))}</td>
        <td>${product.orders_count}</td>
        <td><span class="status ${product.is_active ? 'status-new' : 'status-muted'}">${product.is_active ? 'Активное' : 'Неактивное'}</span></td>
      </tr>
    `)
    .join('');
}

function getFilteredStock() {
  const query = stockSearchQuery.trim().toLowerCase();
  const source = inventorySummary.length ? inventorySummary : metrics;
  return source.filter((item) => {
    if (!query) return true;
    return [item.name, item.code, item.type].filter(Boolean).join(' ').toLowerCase().includes(query);
  });
}

function renderStock() {
  const filteredMetrics = getFilteredStock();

  if (!filteredMetrics.length) {
    stockTableBody.innerHTML = '<tr><td class="empty-state" colspan="5">Складские данные не найдены.</td></tr>';
    return;
  }

  stockTableBody.innerHTML = filteredMetrics
    .map((item) => `
      <tr class="${item.product_id === selectedStockProductId ? 'selected-row' : ''}" data-stock-product-id="${item.product_id}">
        <td><strong>${escapeHtml(item.name)}</strong>${item.code ? `<small>${escapeHtml(item.code)}</small>` : ''}</td>
        <td>${item.available_qty}</td>
        <td>${item.active_order_qty}</td>
        <td>${item.free_qty}</td>
        <td>${item.utilized_qty}</td>
        <td>${item.movement_qty ?? 0}</td>
      </tr>
    `)
    .join('');
}

function renderStockDetails(details) {
  if (!details) {
    stockBalancesTableBody.innerHTML = '<tr><td colspan="2">Выберите изделие.</td></tr>';
    movementHistoryTableBody.innerHTML = '<tr><td colspan="4">Выберите изделие.</td></tr>';
    return;
  }

  if (!details.balances.length) {
    stockBalancesTableBody.innerHTML = '<tr><td colspan="2">По журналу перемещений остатков пока нет.</td></tr>';
  } else {
    stockBalancesTableBody.innerHTML = details.balances
      .map((balance) => `
        <tr>
          <td>${escapeHtml(balance.department_name)}</td>
          <td>${balance.quantity}</td>
        </tr>
      `)
      .join('');
  }

  if (!details.movements.length) {
    movementHistoryTableBody.innerHTML = '<tr><td colspan="4">Перемещений по изделию пока нет.</td></tr>';
    return;
  }

  movementHistoryTableBody.innerHTML = details.movements
    .map((movement) => {
      const route = [
        movement.sender_name || movement.external_party || '—',
        movement.receiver_label || '—'
      ].join(' → ');
      return `
        <tr>
          <td>${escapeHtml(formatDate(movement.movement_date))}</td>
          <td>${escapeHtml(movement.type_name)}</td>
          <td>${escapeHtml(route)}</td>
          <td>${movement.quantity}</td>
        </tr>
      `;
    })
    .join('');
}

function renderDepartmentsDirectory() {
  if (!departmentsTableBody) return;

  if (!departments.length) {
    departmentsTableBody.innerHTML = '<tr><td class="empty-state" colspan="3">Отделы не найдены.</td></tr>';
    return;
  }

  departmentsTableBody.innerHTML = departments
    .map((department) => `
      <tr data-department-id="${department.id}">
        <td><strong>${escapeHtml(department.name)}</strong></td>
        <td><span class="status ${department.is_active ? 'status-new' : 'status-muted'}">${department.is_active ? 'Активен' : 'Неактивен'}</span></td>
        <td>
          <button class="secondary-button edit-department-button" type="button" data-department-id="${department.id}">Изменить</button>
          <button class="ghost-button danger-button delete-department-button" type="button" data-department-id="${department.id}">Удалить</button>
        </td>
      </tr>
    `)
    .join('');
}

function renderOrders() {
  ordersResultCount.textContent = formatRecordCount(ordersPager.total);

  if (!orders.length) {
    tableBody.innerHTML = '<tr><td class="empty-state" colspan="9">Заказы по выбранным условиям не найдены.</td></tr>';
    ordersPagination.classList.add('hidden');
    return;
  }

  tableBody.innerHTML = orders
    .map((order) => {
      const dueState = getDueState(order);
      const statusTone = getStatusTone(order.status_name);
      const remainingQty = getRemainingQty(order);
      return `
        <tr class="${order.id === selectedOrderId ? 'selected-row' : ''}" data-order-id="${order.id}">
          <td class="id-cell">${escapeHtml(formatOrderNumber(order.order_number))}</td>
          <td>
            <strong>${escapeHtml(formatValue(order.product_name))}</strong>
            ${order.product_code ? `<small>${escapeHtml(order.product_code)}</small>` : ''}
          </td>
          <td>${escapeHtml(formatValue(order.customer_name))}</td>
          <td>${order.amount}</td>
          <td>${order.done_qty}</td>
          <td>${remainingQty}</td>
          <td>
            <div class="date-cell">
              <strong>${escapeHtml(formatDate(order.finish_date))}</strong>
              <small><span class="date-status date-status-${dueState.tone}">${escapeHtml(dueState.label)}</span></small>
            </div>
          </td>
          <td>${escapeHtml(formatValue(order.department_name))}</td>
          <td><span class="status status-${statusTone}">${escapeHtml(formatValue(order.status_name))}</span></td>
        </tr>
      `;
    })
    .join('');

  renderPagination(ordersPagination, ordersPager, (page) => {
    loadOrders(page).catch((error) => alert(error.message));
  });
}

function renderPlanOrders() {
  if (!planOrders.length) {
    planOrdersTableBody.innerHTML = '<tr><td class="empty-state" colspan="10">По выбранным условиям план пуст.</td></tr>';
    planPagination.classList.add('hidden');
    updatePlanSelectionState();
    return;
  }

  planOrdersTableBody.innerHTML = planOrders
    .map((order) => {
      const dueState = getDueState(order);
      const statusTone = getStatusTone(order.status_name);
      return `
        <tr>
          <td><input class="plan-row-checkbox" type="checkbox" data-plan-order-id="${order.id}" ${selectedPlanOrderIds.has(order.id) ? 'checked' : ''} aria-label="Включить заказ в Word"></td>
          <td class="id-cell">${escapeHtml(formatOrderNumber(order.order_number))}</td>
          <td><strong>${escapeHtml(formatValue(order.product_name))}</strong></td>
          <td>${escapeHtml(formatValue(order.customer_name))}</td>
          <td>${order.amount}</td>
          <td>${order.done_qty}</td>
          <td>${getRemainingQty(order)}</td>
          <td><span class="date-status date-status-${dueState.tone}">${escapeHtml(formatDate(order.finish_date))}</span></td>
          <td>${escapeHtml(formatValue(order.department_name))}</td>
          <td><span class="status status-${statusTone}">${escapeHtml(formatValue(order.status_name))}</span></td>
        </tr>
      `;
    })
    .join('');

  renderPagination(planPagination, planPager, (page) => {
    loadPlanOrders(page).catch((error) => alert(error.message));
  });
  updatePlanSelectionState();
}

function renderArchive() {
  if (!archivedOrders.length) {
    archiveTableBody.innerHTML = '<tr><td class="empty-state" colspan="8">Архив пока пуст.</td></tr>';
    archivePagination.classList.add('hidden');
    return;
  }

  archiveTableBody.innerHTML = archivedOrders
    .map((order) => `
      <tr>
        <td class="id-cell">${escapeHtml(formatOrderNumber(order.order_number))}</td>
        <td>${escapeHtml(formatValue(order.product_name))}</td>
        <td>${escapeHtml(formatValue(order.customer_name))}</td>
        <td>${order.amount}</td>
        <td>${order.done_qty}</td>
        <td>${escapeHtml(formatDate(order.finish_date))}</td>
        <td>${escapeHtml(formatDate(order.deleted_at || order.updated_at))}</td>
        <td><button class="secondary-button restore-order-button" type="button" data-archive-id="${order.id}">Вернуть</button></td>
      </tr>
    `)
    .join('');

  renderPagination(archivePagination, archivePager, (page) => {
    loadArchive(page).catch((error) => alert(error.message));
  });
}

function orderPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!payload.product_id) delete payload.product_id;
  if (!payload.customer_id) delete payload.customer_id;
  if (!payload.department_id) delete payload.department_id;
  if (!payload.target_department_id) delete payload.target_department_id;
  return payload;
}

function customerPayload(form) {
  return {
    id: form.elements.id.value,
    name: form.elements.name.value,
    short_name: form.elements.short_name.value,
    city: form.elements.city.value,
    contact_person: form.elements.contact_person.value,
    phone: form.elements.phone.value,
    email: form.elements.email.value,
    comments: form.elements.comments.value,
    is_internal: form.elements.is_internal.checked ? 1 : 0,
    is_active: form.elements.is_active.checked ? 1 : 0
  };
}

function productPayload(form) {
  return {
    id: form.elements.id.value,
    name: form.elements.name.value,
    code: form.elements.code.value,
    type: form.elements.type.value || 'Неклассифицированные / Без группы',
    unit: form.elements.unit.value,
    manufacturer: form.elements.manufacturer.value,
    comments: form.elements.comments.value,
    is_active: form.elements.is_active.checked ? 1 : 0
  };
}

function stockPayload(form, existing = null) {
  return {
    planned_qty: existing?.planned_qty ?? 0,
    produced_qty: form.elements.produced_qty.value,
    defect_qty: form.elements.defect_qty.value,
    shipped_qty: form.elements.shipped_qty.value,
    utilized_qty: form.elements.utilized_qty.value,
    notes: form.elements.notes.value
  };
}

function movementPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!payload.sender_id) delete payload.sender_id;
  if (!payload.receiver_id) delete payload.receiver_id;
  if (!payload.customer_id) delete payload.customer_id;
  if (!payload.external_party) delete payload.external_party;
  if (!payload.comments) delete payload.comments;
  return payload;
}

async function saveJson(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось сохранить данные');
  }

  return data;
}

async function selectOrder(orderId) {
  selectedOrderId = Number(orderId);
  renderOrders();

  const response = await fetch(`/api/orders/${selectedOrderId}`);
  if (!response.ok) {
    alert('Не удалось открыть заказ');
    return;
  }

  const order = await response.json();
  orderDetailsBackdrop.classList.remove('hidden');
  orderDetailsCard.classList.remove('hidden');
  detailsForm.classList.remove('hidden');
  detailsTitle.textContent = `${formatOrderNumber(order.order_number)} · ${formatValue(order.product_name)}`;
  detailOrderNumber.value = formatOrderNumber(order.order_number);
  detailRemainingQty.value = String(getRemainingQty(order));

  setFormValue(detailsForm, 'id', order.id);
  setFormValue(detailsForm, 'product_id', order.product_id);
  setFormValue(detailsForm, 'product_name_manual', '');
  setFormValue(detailsForm, 'amount', order.amount);
  setFormValue(detailsForm, 'done_qty', order.done_qty);
  setFormValue(detailsForm, 'start_date', order.start_date);
  setFormValue(detailsForm, 'finish_date', order.finish_date);
  setFormValue(detailsForm, 'fact_date', order.fact_date);
  setFormValue(detailsForm, 'customer_id', order.customer_id);
  setFormValue(detailsForm, 'department_id', order.department_id);
  setFormValue(detailsForm, 'target_department_id', order.target_department_id);
  setFormValue(detailsForm, 'main_order', order.main_order);
  setFormValue(detailsForm, 'comments', order.comments);
  setFormValue(detailsForm, 'status_id', order.status_id);
  setFormValue(detailsForm, 'type_id', order.type_id);
  setSaveState('Без изменений');
}

async function selectCustomer(customerId) {
  selectedCustomerId = Number(customerId);
  renderCustomers();

  const response = await fetch(`/api/customers/${selectedCustomerId}`);
  if (!response.ok) {
    alert('Не удалось открыть заказчика');
    return;
  }

  const customer = await response.json();
  customerFormTitle.textContent = `Заказчик #${customer.id}`;
  Object.entries(customer).forEach(([key, value]) => setFormValue(customerForm, key, value));
  setCustomerSaveState('Без изменений');
}

async function selectProduct(productId) {
  selectedProductId = Number(productId);
  renderProducts();

  const response = await fetch(`/api/products/${selectedProductId}`);
  if (!response.ok) {
    alert('Не удалось открыть изделие');
    return;
  }

  const product = await response.json();
  productFormTitle.textContent = `Изделие #${product.id}`;
  Object.entries(product).forEach(([key, value]) => setFormValue(productForm, key, value));
  setProductSaveState('Без изменений');
}

async function selectStockProduct(productId) {
  selectedStockProductId = Number(productId);
  renderStock();

  const [metricsResponse, detailsResponse] = await Promise.all([
    fetch(`/api/product-metrics/${selectedStockProductId}`),
    fetch(`/api/inventory/products/${selectedStockProductId}`)
  ]);
  if (!metricsResponse.ok || !detailsResponse.ok) {
    alert('Не удалось открыть складскую карточку');
    return;
  }

  const item = await metricsResponse.json();
  selectedStockDetails = await detailsResponse.json();
  emptyStockDetails.classList.add('hidden');
  stockForm.classList.remove('hidden');
  setFormValue(movementForm, 'product_id', selectedStockProductId);
  setFormValue(movementForm, 'movement_date', new Date().toISOString().slice(0, 10));
  stockTitle.textContent = item.name;
  setFormValue(stockForm, 'product_id', item.product_id);
  setFormValue(stockForm, 'produced_qty', item.produced_qty);
  setFormValue(stockForm, 'defect_qty', item.defect_qty);
  setFormValue(stockForm, 'shipped_qty', item.shipped_qty);
  setFormValue(stockForm, 'utilized_qty', item.utilized_qty);
  setFormValue(stockForm, 'notes', item.notes);
  stockAvailableValue.textContent = item.available_qty;
  stockReservedValue.textContent = item.active_order_qty;
  stockFreeValue.textContent = item.free_qty;
  renderStockDetails(selectedStockDetails);
  setStockSaveState('Без изменений');
}

function syncPlanFiltersFromOrders() {
  planFilters = { ...orderFilters, statusIds: [...orderFilters.statusIds] };
  planPager.page = 1;
  clearPlanSelection();
  planDateFromInput.value = planFilters.dateFrom;
  planDateToInput.value = planFilters.dateTo;
  planCustomerFilter.value = planFilters.customerId;
  planProductFilter.value = planFilters.productId;
  fillStatusFilters();
  loadPlanOrders(1).catch((error) => alert(error.message));
}

function downloadPlanDocx() {
  const query = buildQuery(planFilters);
  const params = new URLSearchParams(query);
  if (selectedPlanOrderIds.size) {
    params.set('order_ids', [...selectedPlanOrderIds].join(','));
  }
  const exportQuery = params.toString();
  window.location.href = `/api/orders/plan/export${exportQuery ? `?${exportQuery}` : ''}`;
}

async function addDictionaryItem(endpoint, promptText, successMessage) {
  const value = window.prompt(promptText, '');
  if (!value) return;

  try {
    await saveJson(endpoint, 'POST', { name: value });
    await loadDictionaries();
    await loadCustomers();
    await loadProducts();
    setDefaultSelects(orderForm);
    alert(successMessage);
  } catch (error) {
    alert(error.message);
  }
}

async function createDepartmentFromPrompt() {
  const value = window.prompt('Введите название нового отдела', '');
  if (!value) return;

  try {
    await saveJson('/api/departments', 'POST', { name: value });
    await loadDictionaries();
    await loadMetrics();
    alert('Отдел добавлен');
  } catch (error) {
    alert(error.message);
  }
}

async function editDepartment(departmentId) {
  const department = departments.find((item) => item.id === Number(departmentId));
  if (!department) return;

  const name = window.prompt('Название отдела', department.name);
  if (!name) return;
  const isActive = window.confirm('Оставить отдел активным?');

  try {
    await saveJson(`/api/departments/${departmentId}`, 'PUT', {
      name,
      is_active: isActive ? 1 : 0
    });
    await loadDictionaries();
    await loadMetrics();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteDepartment(departmentId) {
  const department = departments.find((item) => item.id === Number(departmentId));
  if (!department) return;

  if (!window.confirm(`Удалить отдел "${department.name}"?`)) return;

  try {
    await saveJson(`/api/departments/${departmentId}`, 'DELETE', {});
    await loadDictionaries();
    await loadMetrics();
  } catch (error) {
    alert(error.message);
  }
}

function bindFilterCheckboxes(container, target) {
  container.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const values = [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => Number(input.value));
    if (target === 'order') {
      orderFilters.statusIds = values;
      ordersPager.page = 1;
      loadOrders(1).catch((error) => alert(error.message));
    } else {
      planFilters.statusIds = values;
      planPager.page = 1;
      clearPlanSelection();
      loadPlanOrders(1).catch((error) => alert(error.message));
    }
  });
}

showFormButton.addEventListener('click', () => {
  activateTab('orders');
  orderFormSection.classList.remove('hidden');
});

closeFormButton.addEventListener('click', () => orderFormSection.classList.add('hidden'));
resetFormButton.addEventListener('click', resetCreateForm);
refreshButton.addEventListener('click', () => {
  refreshActiveTab().catch((error) => alert(error.message));
});

moduleLinks.forEach((link) => {
  link.addEventListener('click', async () => {
    const tabName = link.dataset.tab;
    activateTab(tabName);
    try {
      await ensureTabDataLoaded(tabName);
    } catch (error) {
      alert(error.message);
    }
  });
});

tableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-order-id]');
  if (row) selectOrder(row.dataset.orderId);
});

archiveTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('.restore-order-button');
  if (!button) return;

  try {
    await saveJson(`/api/orders/archive/${button.dataset.archiveId}/restore`, 'POST', {});
    if (loadedTabs.orders) await loadOrders(ordersPager.page);
    if (loadedTabs.plan) await loadPlanOrders(planPager.page);
    if (loadedTabs.archive) await loadArchive(archivePager.page);
  } catch (error) {
    alert(error.message);
  }
});

customersTableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-customer-id]');
  if (row) selectCustomer(row.dataset.customerId);
});

productsTableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-product-id]');
  if (row) selectProduct(row.dataset.productId);
});

stockTableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-stock-product-id]');
  if (row) selectStockProduct(row.dataset.stockProductId);
});

orderSearchInput.addEventListener('input', () => {
  orderFilters.search = orderSearchInput.value.trim();
  ordersPager.page = 1;
  clearTimeout(orderSearchTimer);
  orderSearchTimer = window.setTimeout(() => {
    loadOrders(1).catch((error) => alert(error.message));
  }, 250);
});
orderDateFromInput.addEventListener('change', () => {
  orderFilters.dateFrom = orderDateFromInput.value;
  ordersPager.page = 1;
  loadOrders(1).catch((error) => alert(error.message));
});
orderDateToInput.addEventListener('change', () => {
  orderFilters.dateTo = orderDateToInput.value;
  ordersPager.page = 1;
  loadOrders(1).catch((error) => alert(error.message));
});
orderCustomerFilter.addEventListener('change', () => {
  orderFilters.customerId = orderCustomerFilter.value;
  ordersPager.page = 1;
  loadOrders(1).catch((error) => alert(error.message));
});
orderProductFilter.addEventListener('change', () => {
  orderFilters.productId = orderProductFilter.value;
  ordersPager.page = 1;
  loadOrders(1).catch((error) => alert(error.message));
});
clearOrderFiltersButton.addEventListener('click', () => {
  orderFilters = { search: '', dateFrom: '', dateTo: '', customerId: '', productId: '', statusIds: [] };
  ordersPager.page = 1;
  orderSearchInput.value = '';
  orderDateFromInput.value = '';
  orderDateToInput.value = '';
  orderCustomerFilter.value = '';
  orderProductFilter.value = '';
  fillStatusFilters();
  loadOrders(1).catch((error) => alert(error.message));
});

planDateFromInput.addEventListener('change', () => {
  planFilters.dateFrom = planDateFromInput.value;
  planPager.page = 1;
  clearPlanSelection();
  loadPlanOrders(1).catch((error) => alert(error.message));
});
planDateToInput.addEventListener('change', () => {
  planFilters.dateTo = planDateToInput.value;
  planPager.page = 1;
  clearPlanSelection();
  loadPlanOrders(1).catch((error) => alert(error.message));
});
planCustomerFilter.addEventListener('change', () => {
  planFilters.customerId = planCustomerFilter.value;
  planPager.page = 1;
  clearPlanSelection();
  loadPlanOrders(1).catch((error) => alert(error.message));
});
planProductFilter.addEventListener('change', () => {
  planFilters.productId = planProductFilter.value;
  planPager.page = 1;
  clearPlanSelection();
  loadPlanOrders(1).catch((error) => alert(error.message));
});
planOrdersTableBody.addEventListener('change', (event) => {
  const checkbox = event.target.closest('.plan-row-checkbox');
  if (!checkbox) return;

  const orderId = Number(checkbox.dataset.planOrderId);
  if (checkbox.checked) selectedPlanOrderIds.add(orderId);
  else selectedPlanOrderIds.delete(orderId);
  updatePlanSelectionState();
});
togglePlanSelectionCheckbox.addEventListener('change', () => {
  planOrders.forEach((order) => {
    if (togglePlanSelectionCheckbox.checked) selectedPlanOrderIds.add(order.id);
    else selectedPlanOrderIds.delete(order.id);
  });
  renderPlanOrders();
});
clearPlanSelectionButton.addEventListener('click', () => {
  selectedPlanOrderIds.clear();
  renderPlanOrders();
});
syncPlanFiltersButton.addEventListener('click', syncPlanFiltersFromOrders);
printPlanButton.addEventListener('click', downloadPlanDocx);

bindFilterCheckboxes(orderStatusFilterList, 'order');
bindFilterCheckboxes(planStatusFilterList, 'plan');

addDepartmentButton.addEventListener('click', () => addDictionaryItem('/api/departments', 'Введите название нового отдела', 'Отдел добавлен'));
addDepartmentDetailsButton.addEventListener('click', () => addDictionaryItem('/api/departments', 'Введите название нового отдела', 'Отдел добавлен'));
addTypeButton.addEventListener('click', () => addDictionaryItem('/api/types', 'Введите новый тип заказа', 'Тип заказа добавлен'));
addTypeDetailsButton.addEventListener('click', () => addDictionaryItem('/api/types', 'Введите новый тип заказа', 'Тип заказа добавлен'));
newDepartmentDirectoryButton.addEventListener('click', createDepartmentFromPrompt);
departmentsTableBody.addEventListener('click', (event) => {
  const editButton = event.target.closest('.edit-department-button');
  const deleteButton = event.target.closest('.delete-department-button');

  if (editButton) {
    editDepartment(editButton.dataset.departmentId);
  }

  if (deleteButton) {
    deleteDepartment(deleteButton.dataset.departmentId);
  }
});

detailsForm.elements.amount.addEventListener('input', () => {
  detailRemainingQty.value = String(Math.max(0, toNumber(detailsForm.elements.amount.value) - toNumber(detailsForm.elements.done_qty.value)));
  setSaveState('Есть несохраненные изменения', 'dirty');
});
detailsForm.elements.done_qty.addEventListener('input', () => {
  detailRemainingQty.value = String(Math.max(0, toNumber(detailsForm.elements.amount.value) - toNumber(detailsForm.elements.done_qty.value)));
  setSaveState('Есть несохраненные изменения', 'dirty');
});
detailsForm.addEventListener('input', () => setSaveState('Есть несохраненные изменения', 'dirty'));
reloadDetailsButton.addEventListener('click', () => {
  if (selectedOrderId) {
    selectOrder(selectedOrderId);
  } else {
    clearOrderDetails();
  }
});

closeDetailsButton.addEventListener('click', clearOrderDetails);
orderDetailsBackdrop.addEventListener('click', clearOrderDetails);

duplicateOrderButton.addEventListener('click', async () => {
  const id = detailsForm.elements.id.value;
  try {
    const result = await saveJson(`/api/orders/${id}/duplicate`, 'POST', orderPayload(detailsForm));
    await Promise.all([
      loadOrders(1),
      loadedTabs.plan ? loadPlanOrders(planPager.page) : Promise.resolve(),
      loadedTabs.archive ? loadArchive(archivePager.page) : Promise.resolve(),
      loadProducts(),
      loadCustomers(),
      loadMetrics()
    ]);
    await selectOrder(result.id);
  } catch (error) {
    alert(error.message);
  }
});

deleteOrderButton.addEventListener('click', async () => {
  const id = detailsForm.elements.id.value;
  if (!id) return;
  if (!window.confirm('Переместить заказ в архив удаленных?')) return;

  try {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить заказ');
    });
    clearOrderDetails();
    await Promise.all([
      loadOrders(ordersPager.page),
      loadedTabs.plan ? loadPlanOrders(planPager.page) : Promise.resolve(),
      loadedTabs.archive ? loadArchive(archivePager.page) : Promise.resolve(),
      loadMetrics()
    ]);
  } catch (error) {
    alert(error.message);
  }
});

orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await saveJson('/api/orders', 'POST', orderPayload(orderForm));
    resetCreateForm();
    orderFormSection.classList.add('hidden');
    await Promise.all([
      loadOrders(1),
      loadedTabs.plan ? loadPlanOrders(planPager.page) : Promise.resolve(),
      loadedTabs.archive ? loadArchive(archivePager.page) : Promise.resolve(),
      loadProducts(),
      loadCustomers(),
      loadMetrics()
    ]);
    await selectOrder(result.id);
  } catch (error) {
    alert(error.message);
  }
});

detailsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = detailsForm.elements.id.value;
  setSaveState('Сохранение...', 'saving');

  try {
    await saveJson(`/api/orders/${id}`, 'PUT', orderPayload(detailsForm));
    await Promise.all([
      loadOrders(ordersPager.page),
      loadedTabs.plan ? loadPlanOrders(planPager.page) : Promise.resolve(),
      loadedTabs.archive ? loadArchive(archivePager.page) : Promise.resolve(),
      loadProducts(),
      loadCustomers(),
      loadMetrics()
    ]);
    await selectOrder(id);
    setSaveState('Изменения сохранены', 'saved');
  } catch (error) {
    setSaveState('Ошибка сохранения', 'error');
    alert(error.message);
  }
});

customerSearchInput.addEventListener('input', () => {
  customerSearchQuery = customerSearchInput.value;
  renderCustomers();
});
productSearchInput.addEventListener('input', () => {
  productSearchQuery = productSearchInput.value;
  renderProducts();
});
stockSearchInput.addEventListener('input', () => {
  stockSearchQuery = stockSearchInput.value;
  renderStock();
});

customerForm.addEventListener('input', () => setCustomerSaveState('Есть несохраненные изменения', 'dirty'));
customerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = customerForm.elements.id.value;
  const isEdit = Boolean(id);
  setCustomerSaveState('Сохранение...', 'saving');

  try {
    const result = await saveJson(
      isEdit ? `/api/customers/${id}` : '/api/customers',
      isEdit ? 'PUT' : 'POST',
      customerPayload(customerForm)
    );
    await loadCustomers();
    await selectCustomer(result.id);
    setCustomerSaveState('Изменения сохранены', 'saved');
  } catch (error) {
    setCustomerSaveState('Ошибка сохранения', 'error');
    alert(error.message);
  }
});
newCustomerButton.addEventListener('click', () => {
  activateTab('customers');
  resetCustomerForm();
});
resetCustomerFormButton.addEventListener('click', resetCustomerForm);

productForm.addEventListener('input', () => setProductSaveState('Есть несохраненные изменения', 'dirty'));
productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = productForm.elements.id.value;
  const isEdit = Boolean(id);
  setProductSaveState('Сохранение...', 'saving');

  try {
    const result = await saveJson(
      isEdit ? `/api/products/${id}` : '/api/products',
      isEdit ? 'PUT' : 'POST',
      productPayload(productForm)
    );
    await Promise.all([
      loadProducts(),
      loadedTabs.orders ? loadOrders(ordersPager.page) : Promise.resolve(),
      loadedTabs.plan ? loadPlanOrders(planPager.page) : Promise.resolve(),
      loadedTabs.archive ? loadArchive(archivePager.page) : Promise.resolve(),
      loadMetrics()
    ]);
    await selectProduct(result.id);
    setProductSaveState('Изменения сохранены', 'saved');
  } catch (error) {
    setProductSaveState('Ошибка сохранения', 'error');
    alert(error.message);
  }
});
newProductButton.addEventListener('click', () => {
  activateTab('products');
  resetProductForm();
});
resetProductFormButton.addEventListener('click', resetProductForm);

stockForm.addEventListener('input', () => setStockSaveState('Есть несохраненные изменения', 'dirty'));
stockForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const productId = stockForm.elements.product_id.value;
  const existing = metrics.find((item) => item.product_id === Number(productId));
  setStockSaveState('Сохранение...', 'saving');

  try {
    await saveJson(`/api/product-metrics/${productId}`, 'PUT', stockPayload(stockForm, existing));
    await loadMetrics();
    await selectStockProduct(productId);
    setStockSaveState('Изменения сохранены', 'saved');
  } catch (error) {
    setStockSaveState('Ошибка сохранения', 'error');
    alert(error.message);
  }
});
newMovementButton.addEventListener('click', () => {
  if (!selectedStockProductId) {
    alert('Сначала выберите изделие на складе');
    return;
  }
  stockMovementPanel.classList.remove('hidden');
  setFormValue(movementForm, 'product_id', selectedStockProductId);
  setFormValue(movementForm, 'movement_date', new Date().toISOString().slice(0, 10));
});
cancelMovementButton.addEventListener('click', () => {
  stockMovementPanel.classList.add('hidden');
});
movementForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedStockProductId) {
    alert('Сначала выберите изделие на складе');
    return;
  }

  try {
    await saveJson('/api/inventory/movements', 'POST', movementPayload(movementForm));
    movementForm.reset();
    stockMovementPanel.classList.add('hidden');
    await loadMetrics();
    await selectStockProduct(selectedStockProductId);
  } catch (error) {
    alert(error.message);
  }
});
reloadStockButton.addEventListener('click', () => {
  if (selectedStockProductId) selectStockProduct(selectedStockProductId);
});
openStockProductButton.addEventListener('click', () => {
  if (!selectedStockProductId) return;
  activateTab('products');
  ensureTabDataLoaded('products').catch((error) => alert(error.message));
  selectProduct(selectedStockProductId);
});

detailsForm.classList.add('hidden');
orderDetailsCard.classList.add('hidden');
orderDetailsBackdrop.classList.add('hidden');
activateTab('orders');

loadOrders(1).catch((error) => {
  tableBody.innerHTML = `<tr><td class="empty-state" colspan="9">${escapeHtml(error.message)}</td></tr>`;
});

Promise.allSettled([loadDictionaries(), loadCustomers(), loadProducts()])
  .then(() => {
    fillSelects();
    fillStatusFilters();
    fillProductTypeSuggestions();
    setDefaultSelects(orderForm);
  });
