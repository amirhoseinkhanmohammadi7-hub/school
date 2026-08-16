// API Base URL
const API_URL = '';

// Global variables
let authToken = null;
let currentUser = null;

// Initialize datepickers
$(document).ready(function() {
    $('.datepicker').persianDatepicker({
        format: 'YYYY/MM/DD',
        initialValue: false,
        autoClose: true,
        calendar: {
            persian: {
                locale: 'fa'
            }
        }
    });

    // File input change handler
    $('#receiptImage').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            $('.file-name').text(file.name);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#imagePreview').html(`<img src="${e.target.result}" alt="پیش‌نمایش" onclick="viewImage('${e.target.result}')">`);
            };
            reader.readAsDataURL(file);
        } else {
            $('.file-name').text('');
            $('#imagePreview').html('');
        }
    });
    
    // Drag and drop support
    const uploadArea = document.querySelector('.file-upload-area');
    const fileInput = document.getElementById('receiptImage');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                fileInput.files = files;
                const event = new Event('change');
                fileInput.dispatchEvent(event);
            }
        });
    }

    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
});

// Mobile menu toggle
function toggleMobileMenu() {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('mobile-open');
}

// Theme toggle
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const currentTheme = body.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        body.removeAttribute('data-theme');
        themeIcon.className = 'fa fa-moon-o';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fa fa-sun-o';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = 'fa fa-sun-o';
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    toastIcon.className = `toast-icon fa ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    toastMessage.textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Login form submit
$('#loginForm').on('submit', async function(e) {
    e.preventDefault();
    
    const username = $('#username').val();
    const password = $('#password').val();
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showDashboard();
        } else {
            $('#loginError').text(data.error || 'خطا در ورود');
        }
    } catch (error) {
        $('#loginError').text('خطا در ارتباط با سرور');
        console.error('Login error:', error);
    }
});

// Show dashboard
function showDashboard() {
    $('#loginPage').removeClass('active');
    $('#dashboardPage').addClass('active');
    
    $('#userWelcome').text(`خوش آمدید، ${currentUser.username}`);
    $('#userRole').text(currentUser.role === 'admin' ? 'مدیر' : 'کاربر');
    
    if (currentUser.role === 'admin') {
        $('#adminPanel').show();
        initializeAdminSections();
        loadStatistics();
        loadAllReceipts();
    } else {
        $('#adminPanel').hide();
        loadUserReceipts();
    }
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    $('#dashboardPage').removeClass('active');
    $('#loginPage').addClass('active');
    $('#loginForm')[0].reset();
    $('#loginError').text('');
}

// Receipt form submit
$('#receiptForm').on('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('studentName', $('#studentName').val());
    formData.append('amount', $('#amount').val());
    formData.append('paymentDate', $('#paymentDate').val());
    formData.append('paymentMethod', $('#paymentMethod').val());
    formData.append('receiptImage', $('#receiptImage')[0].files[0]);
    
    try {
        const response = await fetch(`${API_URL}/api/receipts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            $('#receiptSuccess').text('رسید با موفقیت ثبت شد');
            $('#receiptError').text('');
            $('#receiptForm')[0].reset();
            $('.file-name').text('');
            $('#imagePreview').html('');
            
            if (currentUser.role === 'admin') {
                loadAllReceipts();
                loadStatistics();
            } else {
                loadUserReceipts();
            }
            
            setTimeout(() => {
                $('#receiptSuccess').text('');
            }, 3000);
        } else {
            $('#receiptError').text(data.error || 'خطا در ثبت رسید');
            $('#receiptSuccess').text('');
        }
    } catch (error) {
        $('#receiptError').text('خطا در ارتباط با سرور');
        $('#receiptSuccess').text('');
        console.error('Receipt error:', error);
    }
});

// Register form submit (admin only)
$('#registerForm').on('submit', async function(e) {
    e.preventDefault();
    
    const username = $('#newUsername').val();
    const password = $('#newPassword').val();
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            $('#registerSuccess').text('کاربر با موفقیت افزوده شد');
            $('#registerError').text('');
            $('#registerForm')[0].reset();
            
            setTimeout(() => {
                $('#registerSuccess').text('');
            }, 3000);
        } else {
            $('#registerError').text(data.error || 'خطا در افزودن کاربر');
            $('#registerSuccess').text('');
        }
    } catch (error) {
        $('#registerError').text('خطا در ارتباط با سرور');
        $('#registerSuccess').text('');
        console.error('Register error:', error);
    }
});

// Load user receipts
async function loadUserReceipts() {
    try {
        const response = await fetch(`${API_URL}/api/receipts`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const receipts = await response.json();
        displayReceipts(receipts);
    } catch (error) {
        console.error('Load receipts error:', error);
        $('#receiptsTableBody').html('<tr><td colspan="8" class="loading">خطا در بارگذاری اطلاعات</td></tr>');
    }
}

// Load all receipts (admin)
async function loadAllReceipts(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_URL}/api/admin/receipts${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        displayReceipts(data.receipts, true);
        updateSearchStats(data.totalAmount, data.totalCount);
    } catch (error) {
        console.error('Load all receipts error:', error);
        $('#receiptsTableBody').html('<tr><td colspan="8" class="loading">خطا در بارگذاری اطلاعات</td></tr>');
    }
}

// Display receipts in table
function displayReceipts(receipts, isAdmin = false) {
    if (!receipts || receipts.length === 0) {
        $('#receiptsTableBody').html('<tr><td colspan="8" class="loading">هیچ رسیدی یافت نشد</td></tr>');
        $('#cardsView').html('<div class="empty-state">هیچ رسیدی یافت نشد</div>');
        return;
    }
    
    let html = '';
    let cardsHtml = '';
    
    receipts.forEach((receipt, index) => {
        const date = new Date(receipt.created_at).toLocaleDateString('fa-IR');
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${receipt.student_name}</td>
                <td>${receipt.amount.toLocaleString()}</td>
                <td>${receipt.payment_date}</td>
                <td>${receipt.payment_method}</td>
                <td>
                    <img src="${API_URL}/uploads/${receipt.receipt_image}" 
                         alt="فیش واریزی" 
                         onclick="viewImage('${API_URL}/uploads/${receipt.receipt_image}')">
                </td>
                <td>${date}</td>
                <td>
                    <a href="${API_URL}/uploads/${receipt.receipt_image}" target="_blank" class="btn-view">
                        <i class="fa fa-eye"></i> مشاهده
                    </a>
                    <button onclick="deleteReceipt(${receipt.id})" class="btn-delete">
                        <i class="fa fa-trash"></i> حذف
                    </button>
                </td>
            </tr>
        `;
        
        // Mobile card view
        cardsHtml += `
            <div class="card-item">
                <div class="card-row">
                    <span class="card-label">نام دانش‌آموز:</span>
                    <span class="card-value">${receipt.student_name}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">مبلغ (تومان):</span>
                    <span class="card-value">${receipt.amount.toLocaleString()}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">تاریخ واریز:</span>
                    <span class="card-value">${receipt.payment_date}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">روش پرداخت:</span>
                    <span class="card-value">${receipt.payment_method}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">تصویر فیش:</span>
                    <img src="${API_URL}/uploads/${receipt.receipt_image}" 
                         alt="فیش واریزی" 
                         class="card-image"
                         onclick="viewImage('${API_URL}/uploads/${receipt.receipt_image}')">
                </div>
                <div class="card-row">
                    <span class="card-label">تاریخ ثبت:</span>
                    <span class="card-value">${date}</span>
                </div>
                <div class="card-actions">
                    <a href="${API_URL}/uploads/${receipt.receipt_image}" target="_blank" class="btn-view">
                        <i class="fa fa-eye"></i> مشاهده
                    </a>
                    ${isAdmin || receipt.user_id === currentUser.id ? `
                    <button onclick="deleteReceipt(${receipt.id})" class="btn-delete">
                        <i class="fa fa-trash"></i> حذف
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    $('#receiptsTableBody').html(html);
    $('#cardsView').html(cardsHtml);
}

// View image in modal
function viewImage(src) {
    $('#modalImage').attr('src', src);
    $('#imageModal').css('display', 'block');
}

// Close modal
function closeModal() {
    $('#imageModal').css('display', 'none');
}

// Close modal when clicking outside
$(window).on('click', function(e) {
    if ($(e.target).is('#imageModal')) {
        closeModal();
    }
});

// Delete receipt
async function deleteReceipt(id) {
    if (!confirm('آیا از حذف این رسید مطمئن هستید؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/receipts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (currentUser.role === 'admin') {
                loadAllReceipts();
                loadStatistics();
            } else {
                loadUserReceipts();
            }
        } else {
            alert(data.error || 'خطا در حذف رسید');
        }
    } catch (error) {
        alert('خطا در ارتباط با سرور');
        console.error('Delete error:', error);
    }
}

// Search receipts
function searchReceipts() {
    const studentName = $('#searchStudent').val();
    const startDate = $('#searchStartDate').val();
    const endDate = $('#searchEndDate').val();
    
    const params = {};
    if (studentName) params.studentName = studentName;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    if (currentUser.role === 'admin') {
        loadAllReceipts(params);
    } else {
        // Regular users can also search their own receipts
        loadUserReceiptsWithParams(params);
    }
}

// Load user receipts with search params
async function loadUserReceiptsWithParams(params) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_URL}/api/receipts${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const receipts = await response.json();
        displayReceipts(receipts);
    } catch (error) {
        console.error('Search receipts error:', error);
        $('#receiptsTableBody').html('<tr><td colspan="8" class="loading">خطا در بارگذاری اطلاعات</td></tr>');
    }
}

// Reset search
function resetSearch() {
    $('#searchStudent').val('');
    $('#searchStartDate').val('');
    $('#searchEndDate').val('');
    
    if (currentUser.role === 'admin') {
        loadAllReceipts();
        loadStatistics();
    } else {
        loadUserReceipts();
    }
}

// Update search stats
function updateSearchStats(total, count) {
    $('#searchTotal').text(`جمع کل: ${total.toLocaleString()} تومان`);
    $('#searchCount').text(`تعداد: ${count}`);
}

// Global chart instances
let paymentMethodChartInstance = null;
let trendChartInstance = null;
let studentChartInstance = null;

// Load statistics (admin only)
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/api/statistics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const stats = await response.json();
        
        $('#totalAmount').text(stats.total.toLocaleString());
        $('#totalReceipts').text(stats.count);
        
        // Load charts data
        await loadChartsData();
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

// Load charts data
async function loadChartsData() {
    try {
        // Get all receipts for charts
        const response = await fetch(`${API_URL}/api/admin/receipts`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        const receipts = data.receipts || [];
        
        if (receipts.length === 0) {
            renderEmptyCharts();
            return;
        }
        
        // Payment Method Chart (Pie)
        const paymentMethods = {};
        receipts.forEach(r => {
            paymentMethods[r.payment_method] = (paymentMethods[r.payment_method] || 0) + 1;
        });
        
        renderPaymentMethodChart(paymentMethods);
        
        // Trend Chart (Line) - Last 7 days
        const last7Days = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days[dateStr] = 0;
        }
        
        receipts.forEach(r => {
            const receiptDate = new Date(r.created_at).toISOString().split('T')[0];
            if (last7Days.hasOwnProperty(receiptDate)) {
                last7Days[receiptDate] += r.amount;
            }
        });
        
        renderTrendChart(last7Days);
        
        // Student Chart (Bar) - Top 5 students
        const studentAmounts = {};
        receipts.forEach(r => {
            studentAmounts[r.student_name] = (studentAmounts[r.student_name] || 0) + r.amount;
        });
        
        const sortedStudents = Object.entries(studentAmounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        renderStudentChart(sortedStudents);
        
    } catch (error) {
        console.error('Load charts error:', error);
    }
}

// Render empty charts
function renderEmptyCharts() {
    const ctxPayment = document.getElementById('paymentMethodChart');
    const ctxTrend = document.getElementById('trendChart');
    const ctxStudent = document.getElementById('studentChart');
    
    if (ctxPayment) {
        const ctx = ctxPayment.getContext('2d');
        if (paymentMethodChartInstance) paymentMethodChartInstance.destroy();
        paymentMethodChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['بدون داده'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    if (ctxTrend) {
        const ctx = ctxTrend.getContext('2d');
        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['بدون داده'],
                datasets: [{
                    label: 'مبلغ واریزی',
                    data: [0],
                    borderColor: '#667eea',
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    if (ctxStudent) {
        const ctx = ctxStudent.getContext('2d');
        if (studentChartInstance) studentChartInstance.destroy();
        studentChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['بدون داده'],
                datasets: [{
                    label: 'مجموع واریزی',
                    data: [0],
                    backgroundColor: '#667eea'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// Render Payment Method Chart
function renderPaymentMethodChart(paymentMethods) {
    const ctx = document.getElementById('paymentMethodChart').getContext('2d');
    
    if (paymentMethodChartInstance) {
        paymentMethodChartInstance.destroy();
    }
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f7fafc' : '#2d3748';
    
    paymentMethodChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(paymentMethods),
            datasets: [{
                data: Object.values(paymentMethods),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#48bb78',
                    '#ed8936'
                ],
                borderWidth: 2,
                borderColor: isDark ? '#2d3748' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Vazirmatn' } }
                }
            }
        }
    });
}

// Render Trend Chart
function renderTrendChart(last7Days) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f7fafc' : '#2d3748';
    const gridColor = isDark ? '#4a5568' : '#e2e8f0';
    
    // Convert to Persian dates
    const labels = Object.keys(last7Days).map(date => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
    });
    
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'مبلغ واریزی (تومان)',
                data: Object.values(last7Days),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: { family: 'Vazirmatn' },
                    bodyFont: { family: 'Vazirmatn' },
                    rtl: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: textColor,
                        callback: value => value.toLocaleString('fa-IR')
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// Render Student Chart
function renderStudentChart(sortedStudents) {
    const ctx = document.getElementById('studentChart').getContext('2d');
    
    if (studentChartInstance) {
        studentChartInstance.destroy();
    }
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f7fafc' : '#2d3748';
    const gridColor = isDark ? '#4a5568' : '#e2e8f0';
    
    studentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedStudents.map(s => s[0]),
            datasets: [{
                label: 'مجموع واریزی (تومان)',
                data: sortedStudents.map(s => s[1]),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#48bb78',
                    '#ed8936'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: { family: 'Vazirmatn' },
                    bodyFont: { family: 'Vazirmatn' },
                    rtl: true,
                    callbacks: {
                        label: context => context.parsed.y.toLocaleString('fa-IR') + ' تومان'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: textColor,
                        callback: value => value.toLocaleString('fa-IR')
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

// Toggle admin sections visibility
function toggleAdminSection(sectionName) {
    const section = document.getElementById(`${sectionName}Section`);
    const btn = event.target.closest('.toggle-btn');
    const icon = btn.querySelector('i');
    
    if (section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
        btn.classList.remove('collapsed');
        
        // Load charts if toggling stats section
        if (sectionName === 'stats' && !paymentMethodChartInstance) {
            loadChartsData();
        }
    } else {
        section.classList.add('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
        btn.classList.add('collapsed');
    }
}

// Initialize admin sections as collapsed by default for certain sections
function initializeAdminSections() {
    // Hide charts/stats section initially
    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
        statsSection.classList.add('hidden');
    }
    
    // Hide search section initially
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.classList.add('hidden');
    }
    
    // Hide receipts table initially
    const receiptsSection = document.getElementById('receiptsSection');
    if (receiptsSection) {
        receiptsSection.classList.add('hidden');
    }
    
    // Update button icons for collapsed state
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.add('collapsed');
        const icon = btn.querySelector('i');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    });
}
