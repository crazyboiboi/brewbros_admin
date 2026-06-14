// ==============================
// CONFIG
// ==============================

let SERVER = "";
let API_BASE = `${SERVER}/v1/api`;

// ==============================
// STATE
// ==============================

let currentSection = null;
let sortState = {
    key: null,
    direction: "asc"
};
let beansCache = [];
let productsCache = [];
let ordersCache = [];

// ==============================
// SCHEMAS
// ==============================

const BeanSchema = [
    { key: "id", group: "Bean Detail", label: "ID", showColumn: true, readonly: true, sortable: true },
    { key: "country", group: "Bean Detail", label: "Country", showColumn: true, sortable: true },
    { key: "area", group: "Bean Detail", label: "Area", showColumn: true, sortable: true },
    { key: "origin", group: "Bean Detail", label: "Origin", showColumn: true, },
    { key: "roast_profile", group: "Bean Detail", label: "Roast Profile", showColumn: true, },
    { key: "process", group: "Bean Detail", label: "Process", },
    { key: "altitude", group: "Bean Detail", label: "Altitude", },
    { key: "taste_profile", group: "Bean Detail", label: "Taste Profile", }
];

const ProductSchema = [
    { key: "id", group: "Product Detail", label: "ID", showColumn: true, readonly: true, sortable: true },
    { key: "name", group: "Product Detail", label: "Name", showColumn: true, },
    { key: "type", group: "Product Detail", showColumn: true, label: "Type", sortable: true },
    { key: "bean_id", group: "Product Detail", showColumn: true, label: "Bean", type: "select", sortable: true },
    { key: "price", group: "Product Detail", label: "Ori Price", showColumn: true, type: "decimal", step: "0.01", },
    { key: "discount", group: "Product Detail", label: "Discount (%)", type: "number" },
    { key: "stock", group: "Product Detail", label: "Stock", showColumn: true, type: "number" },
    { key: "description", group: "Product Detail", label: "Description", type: "textarea" },
    { key: "image_url", group: "Product Detail", label: "Image URL" },
    { key: "is_active", group: "Product Detail", showColumn: true, label: "Active", type: "boolean", sortable: true },
    { key: "is_new", group: "Product Detail", label: "New", type: "boolean" },
];

const OrderSchema = [
    { key: "id", group: "Order Detail", label: "Order ID", showColumn: true, readonly: true, colFormat: (v) => `${v.substring(0, 8)}...`, sortable: true },
    { key: "first_name", group: "Order Detail", showColumn: true, label: "First Name", sortable: true },
    { key: "last_name", group: "Order Detail", showColumn: true, label: "Last Name", sortable: true },
    { key: "email", group: "Order Detail", showColumn: true, label: "Email", sortable: true },
    { key: "phone", group: "Order Detail", label: "Phone" },
    { key: "billing_address", group: "Order Detail", label: "Billing Address", readonly: true },
    { key: "subtotal", group: "Order Detail", label: "Subtotal", showColumn: true, readonly: true, colFormat: (v) => `RM ${Number(v).toFixed(2)}` },
    {
        key: "status", group: "Order Detail", label: "Order Status", showColumn: true, type: "select", sortable: true,
        options: [
            { label: "Pending", value: "PENDING" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Cancelled", value: "CANCELLED" }
        ]
    },
    { key: "created_at", group: "Order Detail", showColumn: true, readonly: true, label: "Order Time", sortable: true, colFormat: (v) => new Date(v).toLocaleString() },
    { key: "updated_at", group: "Order Detail", readonly: true, label: "Order Last Updated" },

    { key: "delivery_needed", group: "Delivery Detail", showColumn: true, readonly: true, label: "Delivery Needed", type: "boolean", },
    {
        key: "delivery_status", group: "Delivery Detail", label: "Delivery Status", type: "select", options: [
            { label: "Not Needed", value: "NOT_NEEDED" },
            { label: "Pending", value: "PENDING" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Cancelled", value: "CANCELLED" }
        ]
    },
    { key: "delivery_address", group: "Delivery Detail", label: "Delivery Address", readonly: true },

    { key: "payment_method", group: "Payment Detail", label: "Payment Method", readonly: true },
    { key: "payment_amount", group: "Payment Detail", label: "Payment Amount" },
    {
        key: "payment_status", group: "Payment Detail", label: "Payment Status", type: "select", options: [
            { label: "Pending", value: "PENDING" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Failed", value: "FAILED" },
            { label: "Refunded", value: "REFUNDED" }
        ]
    },
];

// ==============================
// EVENT LISTENER
// ==============================

document.addEventListener("DOMContentLoaded", () => {
    initServer();
    updateLoginStatus();
    initNavigation();
    createToastContainer();
    createModalRoot();

    // Add login form event listener
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // Check for authentication token
    const token = localStorage.getItem("admin_token");
    if (!token) {
        showLoginModal();
    }
});

document.addEventListener("click", (e) => {
    const th = e.target.closest(".sortable");
    if (th) {
        const key = th.dataset.key;
        handleSort(key);
    }
});

// ==============================
// INIT
// ==============================

async function initServer() {
    const backendSelector = document.getElementById("backend-selector");
    let selectedServer = localStorage.getItem("selectedServer");
    if (selectedServer) {
        if (backendSelector.value !== selectedServer) {
            backendSelector.value = selectedServer;
        }
        SERVER = selectedServer;
    } else {
        SERVER = backendSelector.value;
        localStorage.setItem("selectedServer", SERVER);
    }

    API_BASE = `${SERVER}/v1/api`;

    // Listen for changes
    backendSelector.addEventListener("change", async () => {
        const selectedServer = backendSelector.value;
        localStorage.setItem("selectedServer", selectedServer);
        SERVER = selectedServer;
        API_BASE = `${SERVER}/v1/api`;
        await clearCache(true);
    });
}

async function clearCache(clear = false) {
    console.log("Now using server:", SERVER);

    if (clear) {
        showLoginModal();
        localStorage.removeItem("admin_token");
        localStorage.removeItem("beans_cache");
        localStorage.removeItem("products_cache");
        localStorage.removeItem("orders_cache");
    }

    beansCache = [];
    productsCache = [];
    ordersCache = [];
}

async function loadAll() {
    await loadBeans();
    await loadProducts();
    await loadOrders();
}

// ==============================
// NAVIGATION
// ==============================

function initNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".section");

    navButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const target = btn.dataset.section;
            currentSection = target;

            sections.forEach(sec => sec.classList.add("hidden"));
            if (document.getElementById(target)) {
                document.getElementById(target).classList.remove("hidden");
            }

            try {
                if (target === "beans") await loadBeans();
                if (target === "products") await loadProducts();
                if (target === "orders") await loadOrders();
            } catch (err) {
                handleError(err);
            }
        });
    });
}

// ==============================
// LOGIN MODAL
// ==============================

function showLoginModal() {
    const modal = document.getElementById("login-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    modal.onclick = (e) => {
        if (e.target.id === "login-modal") closeLoginModal();
    };

    document.getElementById("username").focus();
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("login-form").reset();
    document.getElementById("login-error").classList.add("hidden");
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("login-error");

    try {
        console.log(API_BASE);
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            let errMessage = "Something went wrong";

            try {
                const errData = await res.json();
                errMessage = errData.error || errData.message || errMessage;
            } catch {
                // response not JSON, ignore
            }

            throw new Error(errMessage);
        }

        const data = await res.json();
        localStorage.setItem("admin_token", data.token);

        closeLoginModal();
        updateLoginStatus();
        loadAll();

        showToast("Login successful", "success");
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove("hidden");
    }
}

// Add event listener for login form
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});


// ==============================
// API CLIENT
// ==============================

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("admin_token");
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        headers,
        ...options
    });

    if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("admin_token");
        updateLoginStatus();
        showLoginModal();
        throw new Error("Authentication required");
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "API request failed");
    }

    if (res.status === 204) return null;

    return res.json();
}

// ==============================
// BEANS
// ==============================

function refreshBeans(resetCache = false) {
    loadBeans(true, resetCache);
}

async function loadBeans(forceRefresh = false, resetCache = false) {
    const container = document.getElementById("beans-table");

    if (resetCache) {
        beansCache = null;
        localStorage.removeItem("beans_cache");
    }

    const cache = loadCache("beans_cache");
    if (cache && !forceRefresh) {
        container.innerHTML = renderTableFromSchema(cache.data, "bean", BeanSchema);
        renderLastUpdated("beans-last-updated", cache.updated_at);
        beansCache = cache.data;
        return;
    }

    container.innerHTML = loadingSpinner();

    try {
        const res = await apiFetch("/beans");
        const beans = res.data;

        beansCache = beans;
        saveCache("beans_cache", beans);

        container.innerHTML = renderTableFromSchema(beans, "bean", BeanSchema);
        renderLastUpdated("beans-last-updated", new Date().toISOString());
    } catch (err) {
        container.innerHTML = `<p class="text-red-600">Failed to load beans: ${err.message}</p>`;
    }
}

function createBean() {
    openFormModal({
        title: "Create New Bean",
        schema: BeanSchema,
        onSubmit: async data => {
            await apiFetch("/beans", { method: "POST", body: JSON.stringify(data) })
            showToast("Bean created", "success");
            await loadBeans();
        }
    });
}

function updateBean(id) {
    const bean = beansCache.find(b => b.id === id);

    openFormModal({
        title: `Bean #${id} - Update Bean`,
        schema: BeanSchema,
        initialData: bean,
        onSubmit: async data => {
            await apiFetch(`/beans?bean_id=${id}`, { method: "PUT", body: JSON.stringify(data) })
            showToast("Bean updated", "success");
            await loadBeans();
        }
    });
}

async function deleteBean(id) {
    openConfirmModal({
        title: "Delete Bean",
        message: "This action cannot be undone. Delete this order?",
        confirmText: "Delete",
        confirmColor: "bg-red-600",
        onConfirm: async () => {
            try {
                await apiFetch(`/beans?bean_id=${id}`, { method: "DELETE" })
                showToast("Bean deleted", "success");
                await loadBeans();
            } catch (err) {
                handleError(err);
            }
        }
    });
}

// ==============================
// PRODUCTS
// ==============================

function refreshProducts(resetCache = false) {
    loadProducts(true, resetCache);
}

async function loadProducts(forceRefresh = false, resetCache = false) {
    const container = document.getElementById("products-table");

    if (resetCache) {
        productsCache = null;
        localStorage.removeItem("product_cache");
    }

    const cache = loadCache("products_cache");
    if (cache && !forceRefresh) {
        container.innerHTML = renderTableFromSchema(cache.data, "product", ProductSchema);
        renderLastUpdated("products-last-updated", cache.updated_at);
        productsCache = cache.data;
        return;
    }

    container.innerHTML = loadingSpinner();

    try {
        const res = await apiFetch("/products");
        const products = res.data;

        productsCache = products;
        saveCache("products_cache", products);

        container.innerHTML = renderTableFromSchema(products, "product", ProductSchema);
        renderLastUpdated("products-last-updated", new Date().toISOString());
    } catch (err) {
        container.innerHTML = `<p class="text-red-600">Failed to load products: ${err.message}</p>`;
    }
}

function buildProductSchema() {
    const beanOptions = beansCache.map(b => ({
        value: b.id,
        label: `${b.country} - ${b.area} (${b.id})`
    }));

    return ProductSchema.map(f => {
        if (f.key === "bean_id") {
            return { ...f, options: beanOptions };
        }
        return f;
    });
}

async function createProduct() {
    if (beansCache.length === 0) await loadBeans();

    openFormModal({
        title: "Create New Product",
        schema: buildProductSchema(),
        onSubmit: async data => {
            try {
                data.is_new = Boolean(data.is_new);
                data.is_active = Boolean(data.is_active);
                await apiFetch("/products", { method: "POST", body: JSON.stringify(data) })
                showToast("Product created", "success");
                await loadProducts();
            } catch (err) {
                handleError(err);
            }
        }
    });
}

async function updateProduct(id) {
    const product = productsCache.find(p => p.id === id);
    if (beansCache.length === 0) await loadBeans();

    openFormModal({
        title: `Product #${id} - Update Product`,
        schema: buildProductSchema(),
        initialData: product,
        onSubmit: async data => {
            try {
                data.is_new = Boolean(data.is_new);
                data.is_active = Boolean(data.is_active);
                await apiFetch(`/products?product_id=${id}`, { method: "PUT", body: JSON.stringify(data) })
                showToast("Product updated", "success");
                await loadProducts();
            } catch (err) {
                handleError(err);
            }
        }
    });
}

async function deleteProduct(id) {
    openConfirmModal({
        title: "Delete Product",
        message: "This action cannot be undone. Delete this order?",
        confirmText: "Delete",
        confirmColor: "bg-red-600",
        onConfirm: async () => {
            try {
                await apiFetch(`/products?product_id=${id}`, { method: "DELETE" })
                showToast("Product deleted", "success");
                await loadProducts();
            } catch (err) {
                handleError(err);
            }
        }
    });
}

// ==============================
// ORDERS LIST PAGE
// ==============================

function refreshOrders(resetCache = false) {
    loadOrders(true, resetCache);
}

async function loadOrders(forceRefresh = false, resetCache = false) {
    const container = document.getElementById("orders-table") || document.getElementById("orders");

    if (resetCache) {
        beansCache = null;
        localStorage.removeItem("beans_cache");
    }

    const cache = loadCache("orders_cache");
    if (cache && !forceRefresh) {
        container.innerHTML = renderTableFromSchema(cache.data, "order", OrderSchema);
        renderLastUpdated("orders-last-updated", cache.updated_at);
        ordersCache = cache.data;
        return;
    }

    container.innerHTML = loadingSpinner();

    try {
        const res = await apiFetch("/orders");
        const orders = res.data;

        ordersCache = orders;
        saveCache("orders_cache", orders);

        container.innerHTML = renderTableFromSchema(orders, "order", OrderSchema);
        renderLastUpdated("orders-last-updated", new Date().toISOString());
    } catch (err) {
        container.innerHTML = `<p class="text-red-600">Failed to load orders: ${err.message}</p>`;
    }
}

function updateOrder(id) {
    const order = ordersCache.find(o => o.id === id);

    const flatData = {
        id: order.id,
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        phone: order.phone,
        billing_address: order.billing_address,
        subtotal: order.subtotal,
        status: order.status,
        created_at: new Date(order.created_at).toLocaleString(),
        updated_at: new Date(order.updated_at).toLocaleString(),

        delivery_needed: order.delivery_detail?.delivery_needed,
        delivery_status: order.delivery_detail?.status,
        delivery_address: order.delivery_detail?.delivery_address,

        payment_method: order.payment_detail?.payment_method,
        payment_amount: order.payment_detail?.amount,
        payment_status: order.payment_detail?.status,
    };

    const orderItems = order.orderItems || [];

    const itemsHTML = renderOrderItems(orderItems);

    openFormModal({
        title: `Order #${id}`,
        schema: OrderSchema,
        initialData: flatData,
        extraContent: itemsHTML,
        onSubmit: async (formData) => {
            try {
                const { order_actions, changed } = mapFormDataToOrderActionsWithDiff(formData, OrderSchema, flatData);

                if (Object.keys(order_actions).length === 0) {
                    showToast("No changes detected.")
                    return;
                }

                // console.log("Changed fields:", changed);
                // console.log("Order actions:", order_actions);

                await apiFetch(`/order?order_id=${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ order_actions }),
                });

                refreshOrders(true);

                showToast("Order updated successfully!", "success");
            } catch (err) {
                handleError(err);
            }
        }
    });
}

function mapFormDataToOrderActionsWithDiff(formData, schema, initialData) {
    const actions = {};
    const changed = {};

    const isChanged = (key, value) => initialData[key] != value;

    // Helper to build action objects
    const buildAction = (keys, actionName, mapKeyNames = {}) => {
        const data = {};
        keys.forEach(k => {
            if (!schema.find(f => f.key === k)?.readonly && formData[k] !== undefined && isChanged(k, formData[k])) {
                const actionKey = mapKeyNames[k] || k;
                data[actionKey] = formData[k];
                changed[k] = { old: initialData[k], new: formData[k] };
            }
        });
        if (Object.keys(data).length > 0) {
            actions[actionName] = data;
        }
    };

    // Order Status
    buildAction(["status"], "UPDATE_ORDER_STATUS");

    // Payment Status
    buildAction(["payment_status"], "UPDATE_PAYMENT_STATUS", { payment_status: "status" });

    // Payment details
    buildAction(["payment_amount"], "UPDATE_PAYMENT_DETAILS", { payment_amount: "amount" });

    // Delivery Status
    buildAction(["delivery_status"], "UPDATE_DELIVERY_STATUS", { delivery_status: "status" });

    // Contact Fields
    buildAction(["first_name", "last_name", "email", "phone"], "UPDATE_CONTACT_DETAILS");

    // Delivery Address
    buildAction(["delivery_address"], "UPDATE_DELIVERY_ADDRESS");

    return { order_actions: actions, changed };
}

function deleteOrder(id) {
    openConfirmModal({
        title: "Delete Order",
        message: "This action cannot be undone. Delete this order?",
        confirmText: "Delete",
        confirmColor: "bg-red-600",
        onConfirm: async () => {
            try {
                await apiFetch(`/order?order_id=${id}`, { method: "DELETE" });
                showToast("Order deleted", "success");
                refreshOrders(true);
            } catch (err) {
                handleError(err);
            }
        }
    });
}

function confirmOrder(id) {
    openConfirmModal({
        title: "Confirm Order",
        message: "Are you sure to confirm this order? This will update the status and send a confirmation email to the customer.",
        confirmText: "Confirm",
        confirmColor: "bg-green-600",
        onConfirm: async () => {
            try {
                await apiFetch(`/order/confirm?order_id=${id}`, { method: "POST" });
                showToast("Order confirmed", "success");
                refreshOrders(true);
            } catch (err) {
                handleError(err);
            }
        }
    })
}

// ==============================
// TABLE RENDER
// ==============================

function renderTableFromSchema(data, type, schema, ctx = {}) {
    if (!data.length) return "<p>No data</p>";

    const visibleColumns = schema.filter(f => f.showColumn);

    // Apply sorting if active
    let processedData = [...data];
    if (sortState.key) {
        const col = schema.find(c => c.key === sortState.key);
        processedData.sort((a, b) => {
            let valA = col?.sortValue ? col.sortValue(a) : a[sortState.key];
            let valB = col?.sortValue ? col.sortValue(b) : b[sortState.key];

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA > valB) return sortState.direction === "asc" ? 1 : -1;
            if (valA < valB) return sortState.direction === "asc" ? -1 : 1;
            return 0;
        });
    }

    const rows = processedData.map(item => `
        <tr class="border-b">
            ${visibleColumns.map(col => {
        let value = item[col.key];

        if (col.colFormat) {
            value = col.colFormat(value, item, ctx);
        }
        // 2. Fallback to type-based formatting
        else if (col.type === "boolean") {
            value = value ? "Yes" : "No";
        }
        else if (col.type === "decimal") {
            value = value != null ? Number(value).toFixed(2) : "";
        }

        return `<td class="p-2">${value ?? ""}</td>`;
    }).join("")}

            <td class="p-2 flex gap-2">
                <button onclick='update${capitalize(type)}(${JSON.stringify(item.id)})' class="text-blue-600 hover:underline">Edit</button>
                <button onclick='delete${capitalize(type)}(${JSON.stringify(item.id)})' class="text-red-600 hover:underline">Delete</button>
                ${type === 'order' ? `<button onclick='confirm${capitalize(type)}(${JSON.stringify(item.id)})' class="text-green-600 hover:underline">Confirm</button>` : ""}
            </td>
        </tr>
    `).join("");

    return `
        <table class="w-full bg-white rounded shadow">
            <thead>
                <tr class="bg-gray-50 border-b">
                    ${visibleColumns.map(col => {
        if (col.sortable) {
            return `
                                <th 
                                    class="sortable p-2 text-left cursor-pointer hover:bg-gray-100"
                                    data-key="${col.key}"
                                >
                                    ${col.label} ${renderSortIcon(col.key)}
                                </th>
                            `;
        }

        return `<th class="p-2 text-left">${col.label}</th>`;
    }).join("")}
                    <th class="p-2">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function renderSortIcon(key) {
    if (sortState.key !== key) return "";
    return sortState.direction === "asc" ? " ↑" : " ↓";
}

function renderTable() {
    if (currentSection === "beans") {
        html = renderTableFromSchema(beansCache, "bean", BeanSchema);
    } else if (currentSection === "orders") {
        html = renderTableFromSchema(ordersCache, "order", OrderSchema);
    } else if (currentSection === "products") {
        html = renderTableFromSchema(productsCache, "product", ProductSchema);
    }

    document.getElementById(`${currentSection}-table`).innerHTML = html;
}

function renderOrderItems(items) {
    if (!items.length) {
        return `
        <div class="pt-4">
            <h3 class="font-semibold mb-2">Order Items</h3>
            <p class="text-gray-500 text-sm">No items found</p>
        </div>
        `;
    }

    const rows = items.map(i => `
        <tr class="border-b">
            <td class="p-2">${i.name} (${i.id})</td>
            <td class="p-2">${i.type}</td>
            <td class="p-2">${i.quantity}</td>
            <td class="p-2">${i.price}</td>
            <td class="p-2">${i.quantity * i.price}</td>
        </tr>
    `).join("");

    return `
        <div class="pt-4">
            <h3 class="font-semibold mb-2">Order Items</h3>

            <table class="w-full text-sm border rounded">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="p-2 text-left">Product</th>
                        <th class="p-2 text-left">Type</th>
                        <th class="p-2 text-left">Qty</th>
                        <th class="p-2 text-left">Price</th>
                        <th class="p-2 text-left">Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function handleSort(key) {
    if (sortState.key !== key) {
        sortState.key = key;
        sortState.direction = "asc";
    } else {
        if (sortState.direction === "asc") {
            sortState.direction = "desc";
        } else if (sortState.direction === "desc") {
            sortState.key = null;
            sortState.direction = null;
        } else {
            // Fallback
            sortState.direction = "asc";
        }
    }

    renderTable();
}

// ==============================
// MODAL SYSTEM
// ==============================

function createModalRoot() {
    const div = document.createElement("div");
    div.id = "modal-root";
    document.body.appendChild(div);
}

function openFormModal({ title, schema, initialData = {}, extraContent = "", onSubmit }) {
    const grouped = schema.reduce((acc, field) => {
        if (!acc[field.group]) acc[field.group] = [];
        acc[field.group].push(field);
        return acc;
    }, {});

    const fields = Object.entries(grouped).map(([groupName, groupFields]) => {
        const groupHTML = groupFields.map(f => {
            const value = initialData[f.key] ?? "";

            // SELECT
            if (f.type === "select") {
                if (f.readonly) {
                    const selected = (f.options || []).find(o => o.value == value);
                    return `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${f.label}</label>
                            <div class="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700">
                                ${selected?.label || "-"}
                            </div>
                        </div>
                    `;
                }

                const opts = (f.options || [])
                    .map(o => `<option value="${o.value}" ${value == o.value ? "selected" : ""}>${o.label}</option>`)
                    .join("");

                return `
                    <div>
                        <label class="block text-sm font-medium mb-1">${f.label}</label>
                        <select name="${f.key}" class="w-full border rounded px-3 py-2">
                            ${opts}
                        </select>
                    </div>
                `;
            }

            // BOOLEAN / CHECKBOX
            if (f.type === "boolean") {
                return `
                    <div>
                        <label class="block text-sm font-medium mb-1">${f.label}</label>
                        <div class="w-full px-3 py-2 bg-white flex items-center">
                            <input 
                                name="${f.key}" 
                                type="checkbox" 
                                ${value ? "checked" : ""} 
                                ${f.readonly ? "disabled" : ""} 
                                class="h-4 w-4 rounded mr-2 cursor-pointer"
                            />
                        </div>
                    </div>
                `;
            }

            if (f.type === "textarea") {
                const rowCount = f.rows || 3;

                if (f.readonly) {
                    return `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${f.label}</label>
                            <div class="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700 whitespace-pre-wrap min-h-[4.5rem]">
                                ${value || "-"}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div>
                        <label class="block text-sm font-medium mb-1">${f.label}</label>
                        <textarea 
                            name="${f.key}" 
                            rows="${rowCount}"
                            class="w-full border rounded px-3 py-2 resize-y"
                        >${value}</textarea>
                    </div>
                `;
            }

            // DEFAULT INPUT (text / decimal / number)
            if (f.readonly) {
                return `
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">${f.label}</label>
                        <div class="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700">
                            ${value || "-"}
                        </div>
                    </div>
                `;
            }

            return `
                <div>
                    <label class="block text-sm font-medium mb-1">${f.label}</label>
                    <input 
                        name="${f.key}" 
                        value="${value}" 
                        class="w-full border rounded px-3 py-2"
                        ${f.type === "decimal" ? 'type="number" step="0.01" min="0"' : `type="${f.type || "text"}"`}
                    />
                </div>
            `;
        }).join("");

        return `
            <div class="space-y-3 border rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-700 border-b pb-1">
                    ${groupName}
                </h3>
                ${groupHTML}
            </div>
        `;
    }).join("");

    const modalHTML = `
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div class="bg-white w-[520px] rounded shadow max-h-[90vh] flex flex-col">
                <div class="p-6 border-b">
                    <h2 class="text-lg font-semibold">${title}</h2>
                </div>

                <form id="admin-form" class="flex flex-col flex-1 overflow-hidden">
                    <div class="p-6 space-y-4 overflow-y-auto flex-1">
                        ${fields}
                        ${extraContent}
                    </div>

                    <div class="p-4 border-t flex justify-end gap-2">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 border rounded">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-black text-white rounded">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modal-root");
    root.innerHTML = modalHTML;

    if (schema.length > 0) {
        document.getElementById("admin-form").onsubmit = async e => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            await onSubmit(data);

            closeModal();
        };
    }
}

function closeModal() {
    document.getElementById("modal-root").innerHTML = "";
}

// ==============================
// LOADING
// ==============================

function loadingSpinner() {
    return `
        <div class="p-6 flex items-center gap-3 text-gray-500">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            <span>Loading...</span>
        </div>
    `;
}

// ==============================
// TOASTS
// ==============================

function createToastContainer() {
    const div = document.createElement("div");
    div.id = "toast-container";
    div.className = "fixed to top-8 left-1/2 transform -translate-x-1/2 -translate-y-1/2 space-y-2 z-50 flex flex-col items-center";
    document.body.appendChild(div);
}

function showToast(message, type = "info") {
    const colors = {
        success: "bg-green-600",
        error: "bg-red-600",
        info: "bg-gray-800"
    };

    const toast = document.createElement("div");
    toast.className = `${colors[type]} text-white px-4 py-2 rounded shadow`;
    toast.innerText = message;

    document.getElementById("toast-container").appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ==============================
// POPUP MODAL
// ==============================

let confirmCallback = null;
let confirmLabel = "Confirm";

function openConfirmModal({
    title = "Confirm Action",
    message = "Are you sure?",
    confirmText = "Confirm",
    confirmColor = "bg-red-600",
    onConfirm
}) {
    document.getElementById("confirm-title").innerText = title;
    document.getElementById("confirm-message").innerText = message;

    const confirmBtn = document.getElementById("confirm-action-btn");

    confirmLabel = confirmText;
    confirmBtn.innerText = confirmText;

    confirmBtn.className = `px-4 py-2 rounded text-white ${confirmColor}`;

    confirmCallback = onConfirm;

    const modal = document.getElementById("confirm-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    modal.onclick = (e) => {
        if (e.target.id === "confirm-modal") closeConfirmModal();
    };

    confirmBtn.onclick = async () => {
        if (!confirmCallback) return;

        try {
            confirmBtn.disabled = true;

            const originalText = confirmLabel;
            confirmBtn.innerText = "Processing...";

            await confirmCallback();

            closeConfirmModal();
        } catch (err) {
            console.error(err);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerText = confirmLabel;
        }
    };
}

function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    confirmCallback = null;
}

// ==============================
// LOGIN STATUS
// ==============================

function updateLoginStatus() {
    const indicator = document.getElementById("login-status");
    const token = localStorage.getItem("admin_token");

    if (token && indicator) {
        indicator.classList.remove("hidden");
    } else if (indicator) {
        indicator.classList.add("hidden");
    }
}

// ==============================
// ERROR
// ==============================

function handleError(err) {
    console.error(err);
    showToast(err.message || "Something went wrong", "error");
}

// ==============================
// UTILS
// ==============================

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function saveCache(key, data) {
    const payload = {
        data,
        updated_at: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(payload));
}

function loadCache(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        const data = JSON.parse(raw);
        if (Date.now() - new Date(data.updated_at) > 3600000) {
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function renderLastUpdated(elementId, timestamp) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerText = timestamp
        ? `Last updated: ${new Date(timestamp).toLocaleString()}`
        : "Never refreshed";
}
