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
                $('#imagePreview').html(`<img src="${e.target.result}" alt="پیش‌نمایش">`);
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
        return;
    }
    
    let html = '';
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
    });
    
    $('#receiptsTableBody').html(html);
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
        
        // Load chart data
        loadChartData();
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

// Global chart instance
let depositsChartInstance = null;

// Load chart data
async function loadChartData() {
    try {
        const response = await fetch(`${API_URL}/api/chart-data`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const chartData = await response.json();
        renderChart(chartData);
    } catch (error) {
        console.error('Load chart data error:', error);
    }
}

// Render chart
function renderChart(data) {
    const ctx = document.getElementById('depositsChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (depositChartInstance) {
        depositChartInstance.destroy();
    }
    
    // Create new chart
    depositChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'مبلغ واریزی (تومان)',
                    data: data.amounts,
                    backgroundColor: 'rgba(23, 162, 184, 0.7)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'تعداد واریزی',
                    data: data.counts,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e8e8e8',
                        font: {
                            family: 'Tahoma',
                            size: 14
                        }
                    }
                },
                tooltip: {
                    rtl: true,
                    titleAlign: 'right',
                    bodyAlign: 'right',
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex === 0) {
                                    label += context.parsed.y.toLocaleString() + ' تومان';
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: 'Tahoma',
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(61, 90, 128, 0.3)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: '#17a2b8',
                        font: {
                            family: 'Tahoma',
                            size: 12
                        },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(61, 90, 128, 0.3)'
                    },
                    title: {
                        display: true,
                        text: 'مبلغ (تومان)',
                        color: '#17a2b8',
                        font: {
                            family: 'Tahoma',
                            size: 14
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: '#28a745',
                        font: {
                            family: 'Tahoma',
                            size: 12
                        },
                        callback: function(value) {
                            return Math.round(value);
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'تعداد',
                        color: '#28a745',
                        font: {
                            family: 'Tahoma',
                            size: 14
                        }
                    }
                }
            }
        }
    });
}
