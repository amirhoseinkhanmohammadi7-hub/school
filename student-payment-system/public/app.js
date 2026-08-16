// Student Payment System - Frontend JavaScript
const API_BASE = '/api';

// State management
let currentUser = null;
let currentView = 'login';

// Utility functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatToman(amount) {
    return formatNumber(Math.round(amount)) + ' تومان';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
}

// API calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function uploadReceipt(formData) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/receipts/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }
        
        return data;
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

// Authentication
async function login(username, password) {
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        
        showView(currentUser.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
        updateNavButtons();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function registerUser(username, password, role = 'user') {
    try {
        await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
        
        showAlert('کاربر با موفقیت ثبت شد', 'success');
        showView('admin-users');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showView('login');
    updateNavButtons();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        currentUser = JSON.parse(userStr);
        return true;
    }
    
    return false;
}

// UI Rendering
function updateNavButtons() {
    const navButtons = document.getElementById('navButtons');
    
    if (currentUser) {
        navButtons.innerHTML = `
            <span style="color: var(--text-secondary); margin-left: 15px; display: flex; align-items: center;">
                👤 ${currentUser.username}
                ${currentUser.role === 'admin' ? '<span class="badge badge-admin" style="margin-right: 8px;">مدیر</span>' : ''}
            </span>
            ${currentUser.role === 'admin' ? `
                <button class="btn btn-secondary" onclick="showView('admin-dashboard')">داشبورد</button>
                <button class="btn btn-secondary" onclick="showView('admin-users')">کاربران</button>
                <button class="btn btn-secondary" onclick="showView('admin-receipts')">رسوب‌ها</button>
            ` : `
                <button class="btn btn-secondary" onclick="showView('user-dashboard')">داشبورد</button>
                <button class="btn btn-secondary" onclick="showView('submit-receipt')">ثبت رسید</button>
            `}
            <button class="btn btn-danger" onclick="logout()">خروج</button>
        `;
    } else {
        navButtons.innerHTML = `
            <button class="btn btn-primary" onclick="showView('login')">ورود</button>
        `;
    }
}

function showAlert(message, type = 'info') {
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-warning';
    
    const app = document.getElementById('app');
    const existingAlert = app.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.textContent = message;
    
    app.insertBefore(alert, app.firstChild);
    
    setTimeout(() => alert.remove(), 5000);
}

function showView(view) {
    currentView = view;
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    switch(view) {
        case 'login':
            renderLogin(app);
            break;
        case 'admin-dashboard':
            renderAdminDashboard(app);
            break;
        case 'admin-users':
            renderAdminUsers(app);
            break;
        case 'admin-receipts':
            renderAdminReceipts(app);
            break;
        case 'user-dashboard':
            renderUserDashboard(app);
            break;
        case 'submit-receipt':
            renderSubmitReceipt(app);
            break;
        default:
            renderLogin(app);
    }
}

// View Renderers
function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container">
            <div class="card">
                <h2>🔐 ورود به سیستم</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label>نام کاربری</label>
                        <input type="text" id="username" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>رمز عبور</label>
                        <input type="password" id="password" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">ورود</button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        login(username, password);
    });
}

async function renderAdminDashboard(container) {
    container.innerHTML = `
        <div class="card">
            <h2>📊 داشبورد مدیریت</h2>
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="label">مجموع کل واریزی‌ها</div>
                    <div class="value" id="totalSum">در حال بارگذاری...</div>
                </div>
                <div class="stat-card">
                    <div class="label">تعداد کل رسیدها</div>
                    <div class="value" id="totalCount">در حال بارگذاری...</div>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <h3>🔍 جستجو و فیلتر پیشرفته</h3>
                
                <div class="filter-section" style="margin-top: 20px;">
                    <div class="form-group">
                        <label>جستجو بر اساس نام دانشجو</label>
                        <input type="text" id="searchName" class="form-control" placeholder="نام دانشجو را وارد کنید">
                    </div>
                    <div class="form-group">
                        <label>تاریخ شروع</label>
                        <input type="text" id="startDate" class="form-control date-picker" placeholder="انتخاب تاریخ">
                    </div>
                    <div class="form-group">
                        <label>تاریخ پایان</label>
                        <input type="text" id="endDate" class="form-control date-picker" placeholder="انتخاب تاریخ">
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-primary" onclick="searchByStudent()">جستجوی دانشجو</button>
                    <button class="btn btn-primary" onclick="filterByDateRange()">فیلتر بر اساس تاریخ</button>
                    <button class="btn btn-secondary" onclick="loadTotalSum()">بارگذاری مجدد آمار</button>
                </div>
                
                <div id="searchResults" style="margin-top: 20px;"></div>
            </div>
        </div>
    `;
    
    // Initialize date pickers
    setTimeout(() => {
        $('.date-picker').persianDatepicker({
            format: 'YYYY/MM/DD',
            autoClose: true,
            initialValue: false
        });
    }, 100);
    
    loadTotalSum();
}

async function loadTotalSum() {
    try {
        const data = await apiCall('/admin/total-sum');
        document.getElementById('totalSum').textContent = formatToman(data.total);
        document.getElementById('totalCount').textContent = formatNumber(data.count);
    } catch (error) {
        document.getElementById('totalSum').textContent = 'خطا در بارگذاری';
        document.getElementById('totalCount').textContent = 'خطا';
    }
}

async function searchByStudent() {
    const name = document.getElementById('searchName').value;
    if (!name) {
        showAlert('لطفاً نام دانشجو را وارد کنید', 'warning');
        return;
    }
    
    try {
        const data = await apiCall(`/admin/search/student?name=${encodeURIComponent(name)}`);
        renderSearchResults(data);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function filterByDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showAlert('لطفاً هر دو تاریخ را انتخاب کنید', 'warning');
        return;
    }
    
    try {
        const data = await apiCall(`/admin/filter/date-range?startDate=${startDate}&endDate=${endDate}`);
        renderSearchResults(data);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function renderSearchResults(data) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (!data.receipts || data.receipts.length === 0) {
        resultsDiv.innerHTML = `
            <div class="alert alert-warning">
                هیچ نتیجه‌ای یافت نشد
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="card">
            <h3>نتایج جستجو</h3>
            <div class="dashboard-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="label">تعداد رسیدها</div>
                    <div class="value">${formatNumber(data.summary.count)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">مجموع مبلغ</div>
                    <div class="value">${formatToman(data.summary.totalAmount)}</div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>نام دانشجو</th>
                            <th>مبلغ (تومان)</th>
                            <th>روش پرداخت</th>
                            <th>تاریخ</th>
                            <th>تصویر رسید</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    data.receipts.forEach(receipt => {
        html += `
            <tr>
                <td>${receipt.studentName}</td>
                <td>${formatToman(receipt.amount)}</td>
                <td>${receipt.paymentMethod}</td>
                <td>${receipt.shamsiDate?.full || formatDate(receipt.gregorianDate)}</td>
                <td><a href="${receipt.receiptImage}" target="_blank" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">مشاهده</a></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}

async function renderAdminUsers(container) {
    container.innerHTML = `
        <div class="card">
            <h2>👥 مدیریت کاربران</h2>
            
            <div style="max-width: 500px; margin-bottom: 30px;">
                <h3 style="font-size: 1.1rem;">افزودن کاربر جدید</h3>
                <form id="registerForm">
                    <div class="form-group">
                        <label>نام کاربری</label>
                        <input type="text" id="newUsername" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>رمز عبور</label>
                        <input type="password" id="newPassword" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>نقش</label>
                        <select id="newRole" class="form-control">
                            <option value="user">کاربر عادی</option>
                            <option value="admin">مدیر</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">افزودن کاربر</button>
                </form>
            </div>
            
            <h3>لیست کاربران</h3>
            <div class="table-container" id="usersTable">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        registerUser(username, password, role);
    });
    
    loadUsers();
}

async function loadUsers() {
    try {
        const users = await apiCall('/auth/users');
        const tableContainer = document.getElementById('usersTable');
        
        if (users.length === 0) {
            tableContainer.innerHTML = '<div class="alert alert-warning">هیچ کاربری یافت نشد</div>';
            return;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>نام کاربری</th>
                        <th>نقش</th>
                        <th>تاریخ ثبت‌نام</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        users.forEach(user => {
            const isCurrentUser = currentUser.id === user._id;
            html += `
                <tr>
                    <td>${user.username}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'مدیر' : 'کاربر'}</span></td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td>
                        ${!isCurrentUser ? `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteUser('${user._id}')">حذف</button>` : '-'}
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    } catch (error) {
        document.getElementById('usersTable').innerHTML = `<div class="alert alert-error">خطا در بارگذاری کاربران: ${error.message}</div>`;
    }
}

async function deleteUser(userId) {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    
    try {
        await apiCall(`/auth/users/${userId}`, { method: 'DELETE' });
        showAlert('کاربر با موفقیت حذف شد', 'success');
        loadUsers();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function renderAdminReceipts(container) {
    container.innerHTML = `
        <div class="card">
            <h2>📄 تمام رسیدها</h2>
            <div class="table-container" id="receiptsTable">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    loadAllReceipts();
}

async function loadAllReceipts() {
    try {
        const receipts = await apiCall('/admin/all');
        const tableContainer = document.getElementById('receiptsTable');
        
        if (receipts.length === 0) {
            tableContainer.innerHTML = '<div class="alert alert-warning">هیچ رسیدی یافت نشد</div>';
            return;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>نام دانشجو</th>
                        <th>مبلغ (تومان)</th>
                        <th>روش پرداخت</th>
                        <th>تاریخ شمسی</th>
                        <th>ارسال توسط</th>
                        <th>تصویر</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        receipts.forEach(receipt => {
            html += `
                <tr>
                    <td>${receipt.studentName}</td>
                    <td>${formatToman(receipt.amount)}</td>
                    <td>${receipt.paymentMethod}</td>
                    <td>${receipt.shamsiDate?.full || formatDate(receipt.gregorianDate)}</td>
                    <td>${receipt.uploadedBy?.username || '-'}</td>
                    <td><a href="${receipt.receiptImage}" target="_blank" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">مشاهده</a></td>
                    <td><button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteReceipt('${receipt._id}')">حذف</button></td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    } catch (error) {
        document.getElementById('receiptsTable').innerHTML = `<div class="alert alert-error">خطا در بارگذاری رسیدها: ${error.message}</div>`;
    }
}

async function deleteReceipt(receiptId) {
    if (!confirm('آیا از حذف این رسید اطمینان دارید؟')) return;
    
    try {
        await apiCall(`/admin/${receiptId}`, { method: 'DELETE' });
        showAlert('رسید با موفقیت حذف شد', 'success');
        loadAllReceipts();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function renderUserDashboard(container) {
    container.innerHTML = `
        <div class="card">
            <h2>📊 داشبورد کاربری</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">به پنل کاربری خود خوش آمدید. می‌توانید رسیدهای پرداخت خود را مشاهده یا رسید جدید ثبت کنید.</p>
            
            <button class="btn btn-primary" onclick="showView('submit-receipt')">➕ ثبت رسید جدید</button>
            
            <h3 style="margin-top: 30px;">رسیدهای من</h3>
            <div class="table-container" id="myReceiptsTable">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    loadMyReceipts();
}

async function loadMyReceipts() {
    try {
        const receipts = await apiCall('/receipts/my-receipts');
        const tableContainer = document.getElementById('myReceiptsTable');
        
        if (receipts.length === 0) {
            tableContainer.innerHTML = '<div class="alert alert-warning">هیچ رسیدی ثبت نکرده‌اید</div>';
            return;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>نام دانشجو</th>
                        <th>مبلغ (تومان)</th>
                        <th>روش پرداخت</th>
                        <th>تاریخ</th>
                        <th>تصویر</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        receipts.forEach(receipt => {
            html += `
                <tr>
                    <td>${receipt.studentName}</td>
                    <td>${formatToman(receipt.amount)}</td>
                    <td>${receipt.paymentMethod}</td>
                    <td>${receipt.shamsiDate?.full || formatDate(receipt.gregorianDate)}</td>
                    <td><a href="${receipt.receiptImage}" target="_blank" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">مشاهده</a></td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    } catch (error) {
        document.getElementById('myReceiptsTable').innerHTML = `<div class="alert alert-error">خطا در بارگذاری رسیدها: ${error.message}</div>`;
    }
}

function renderSubmitReceipt(container) {
    container.innerHTML = `
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <h2>📤 ثبت رسید پرداخت جدید</h2>
            <form id="submitReceiptForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label>نام و نام خانوادگی دانشجو</label>
                    <input type="text" id="studentName" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>مبلغ پرداختی (تومان)</label>
                    <input type="number" id="amount" class="form-control" required min="1">
                </div>
                
                <div class="form-group">
                    <label>روش پرداخت</label>
                    <select id="paymentMethod" class="form-control" required>
                        <option value="">انتخاب کنید...</option>
                        <option value="Card-to-Card">کارت به کارت</option>
                        <option value="POS Machine">دستگاه پوز</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>تاریخ پرداخت (شمسی)</label>
                    <input type="text" id="shamsiDate" class="form-control date-picker" required placeholder="انتخاب تاریخ">
                </div>
                
                <div class="form-group">
                    <label>تصویر رسید</label>
                    <div class="file-upload" onclick="document.getElementById('receiptImage').click()">
                        <p>📎 برای انتخاب فایل کلیک کنید</p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">فرمت‌های مجاز: JPG, PNG, GIF (حداکثر 5MB)</p>
                        <input type="file" id="receiptImage" accept="image/*" required onchange="previewImage(this)">
                        <img id="imagePreview" class="image-preview hidden">
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%;">ثبت رسید</button>
            </form>
        </div>
    `;
    
    // Initialize date picker
    setTimeout(() => {
        $('.date-picker').persianDatepicker({
            format: 'YYYY/MM/DD',
            autoClose: true,
            initialValue: false
        });
    }, 100);
    
    document.getElementById('submitReceiptForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentName = document.getElementById('studentName').value;
        const amount = document.getElementById('amount').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const shamsiDateValue = document.getElementById('shamsiDate').value;
        const receiptImage = document.getElementById('receiptImage').files[0];
        
        if (!receiptImage) {
            showAlert('لطفاً تصویر رسید را انتخاب کنید', 'warning');
            return;
        }
        
        const shamsiDate = {
            full: shamsiDateValue,
            year: parseInt(shamsiDateValue.split('/')[0]),
            month: parseInt(shamsiDateValue.split('/')[1]),
            day: parseInt(shamsiDateValue.split('/')[2])
        };
        
        const formData = new FormData();
        formData.append('studentName', studentName);
        formData.append('amount', amount);
        formData.append('paymentMethod', paymentMethod);
        formData.append('shamsiDate', JSON.stringify(shamsiDate));
        formData.append('receiptImage', receiptImage);
        
        try {
            await uploadReceipt(formData);
            showAlert('رسید با موفقیت ثبت شد', 'success');
            showView('user-dashboard');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        showView(currentUser.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
    } else {
        showView('login');
    }
    updateNavButtons();
});
