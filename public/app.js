// API Base URL
const API_URL = '';

// Global variables
let authToken = null;
let currentUser = null;

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Scroll to section and close sidebar on mobile
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
        
        // Update active nav item
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

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

    // File input change handler with modern UI
    $('#receiptImage').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const uploadArea = document.querySelector('.upload-area');
            uploadArea.classList.add('has-file');
            document.querySelector('.upload-content h3').textContent = file.name;
            document.querySelector('.upload-content p').textContent = `${(file.size / 1024).toFixed(2)} KB`;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#imagePreview').html(`<img src="${e.target.result}" alt="پیش‌نمایش" onclick="viewImage('${e.target.result}')">`);
            };
            reader.readAsDataURL(file);
        }
    });

    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
});

// Login form submit with toast notifications
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
            
            showToast('ورود موفقیت‌آمیز بود', 'success');
            showDashboard();
        } else {
            showToast(data.error || 'خطا در ورود', 'error');
        }
    } catch (error) {
        showToast('خطا در ارتباط با سرور', 'error');
        console.error('Login error:', error);
    }
});

// Show dashboard
function showDashboard() {
    $('#loginPage').removeClass('active');
    $('#dashboardPage').addClass('active');
    
    $('#userWelcome').text(`خوش آمدید، ${currentUser.username}`);
    $('#userRole').text(currentUser.role === 'admin' ? 'مدیر' : 'کاربر').addClass('visible');
    
    // Show admin sections for admin users
    if (currentUser.role === 'admin') {
        $('.admin-only').addClass('visible');
        loadStatistics();
        loadAllReceipts();
    } else {
        $('.admin-only').removeClass('visible');
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

// Receipt form submit with toast notifications
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
            showToast('رسید با موفقیت ثبت شد', 'success');
            $('#receiptForm')[0].reset();
            $('.upload-area').removeClass('has-file');
            document.querySelector('.upload-content h3').textContent = 'تصویر فیش واریزی را آپلود کنید';
            document.querySelector('.upload-content p').textContent = 'یا اینجا کلیک کنید و فایل را انتخاب نمایید';
            $('#imagePreview').html('');
            
            if (currentUser.role === 'admin') {
                loadAllReceipts();
                loadStatistics();
            } else {
                loadUserReceipts();
            }
        } else {
            showToast(data.error || 'خطا در ثبت رسید', 'error');
        }
    } catch (error) {
        showToast('خطا در ارتباط با سرور', 'error');
        console.error('Receipt error:', error);
    }
});

// Register form submit (admin only) with toast
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
            showToast('کاربر با موفقیت افزوده شد', 'success');
            $('#registerForm')[0].reset();
        } else {
            showToast(data.error || 'خطا در افزودن کاربر', 'error');
        }
    } catch (error) {
        showToast('خطا در ارتباط با سرور', 'error');
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

// Display receipts in table (desktop) and cards (mobile)
function displayReceipts(receipts, isAdmin = false) {
    if (!receipts || receipts.length === 0) {
        $('#receiptsTableBody').html('<tr><td colspan="8" class="loading"><div class="loading-spinner"><i class="fas fa-inbox"></i><span>هیچ رسیدی یافت نشد</span></div></td></tr>');
        $('#mobileReceiptsCards').html('<div class="loading-spinner"><i class="fas fa-inbox"></i><span>هیچ رسیدی یافت نشد</span></div>');
        return;
    }
    
    // Desktop table view
    let tableHtml = '';
    let mobileHtml = '';
    
    receipts.forEach((receipt, index) => {
        const date = new Date(receipt.created_at).toLocaleDateString('fa-IR');
        const imageUrl = `${API_URL}/uploads/${receipt.receipt_image}`;
        
        // Table row for desktop
        tableHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${receipt.student_name}</td>
                <td>${receipt.amount.toLocaleString()}</td>
                <td>${receipt.payment_date}</td>
                <td>${receipt.payment_method}</td>
                <td>
                    <img src="${imageUrl}" 
                         alt="فیش واریزی" 
                         onclick="viewImage('${imageUrl}')">
                </td>
                <td>${date}</td>
                <td>
                    <a href="${imageUrl}" target="_blank" class="btn-view">
                        <i class="fas fa-eye"></i> مشاهده
                    </a>
                    ${isAdmin ? `<button onclick="deleteReceipt(${receipt.id})" class="btn-delete">
                        <i class="fas fa-trash"></i> حذف
                    </button>` : ''}
                </td>
            </tr>
        `;
        
        // Mobile card view
        mobileHtml += `
            <div class="receipt-card-mobile">
                <div class="receipt-card-header">
                    <span class="receipt-card-value">#${index + 1}</span>
                    <span class="receipt-card-label">${date}</span>
                </div>
                <div class="receipt-card-body">
                    <div class="receipt-card-item">
                        <span class="receipt-card-label"><i class="fas fa-user"></i> نام دانش‌آموز</span>
                        <span class="receipt-card-value">${receipt.student_name}</span>
                    </div>
                    <div class="receipt-card-item">
                        <span class="receipt-card-label"><i class="fas fa-coins"></i> مبلغ</span>
                        <span class="receipt-card-value">${receipt.amount.toLocaleString()} تومان</span>
                    </div>
                    <div class="receipt-card-item">
                        <span class="receipt-card-label"><i class="fas fa-calendar"></i> تاریخ واریز</span>
                        <span class="receipt-card-value">${receipt.payment_date}</span>
                    </div>
                    <div class="receipt-card-item">
                        <span class="receipt-card-label"><i class="fas fa-credit-card"></i> روش پرداخت</span>
                        <span class="receipt-card-value">${receipt.payment_method}</span>
                    </div>
                    <img src="${imageUrl}" 
                         class="receipt-card-image"
                         alt="فیش واریزی" 
                         onclick="viewImage('${imageUrl}')">
                    <div class="receipt-card-actions">
                        <a href="${imageUrl}" target="_blank" class="btn btn-primary btn-sm" style="flex:1;">
                            <i class="fas fa-eye"></i> مشاهده
                        </a>
                        ${isAdmin ? `<button onclick="deleteReceipt(${receipt.id})" class="btn btn-danger btn-sm" style="flex:1;">
                            <i class="fas fa-trash"></i> حذف
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#receiptsTableBody').html(tableHtml);
    $('#mobileReceiptsCards').html(mobileHtml);
}

// View image in modal
function viewImage(src) {
    $('#modalImage').attr('src', src);
    $('#imageModal').addClass('active');
}

// Close modal
function closeModal() {
    $('#imageModal').removeClass('active');
}

// Close modal when clicking outside
$(window).on('click', function(e) {
    if ($(e.target).is('#imageModal') || $(e.target).hasClass('modal-backdrop')) {
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
            showToast('رسید با موفقیت حذف شد', 'success');
            if (currentUser.role === 'admin') {
                loadAllReceipts();
                loadStatistics();
            } else {
                loadUserReceipts();
            }
        } else {
            showToast(data.error || 'خطا در حذف رسید', 'error');
        }
    } catch (error) {
        showToast('خطا در ارتباط با سرور', 'error');
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
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}
