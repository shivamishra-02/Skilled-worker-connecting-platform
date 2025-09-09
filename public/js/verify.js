document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const emailTab = document.getElementById('emailVerification');
    const phoneTab = document.getElementById('phoneVerification');
    const emailForm = document.getElementById('emailVerificationForm');
    const phoneForm = document.getElementById('phoneVerificationForm');
    const emailStatus = document.getElementById('emailStatus');
    const phoneStatus = document.getElementById('phoneStatus');
    const successMessage = document.getElementById('verificationSuccess');
    const devFallback = document.getElementById('devFallback');
    
    // Get userId from localStorage or URL
    const userId = localStorage.getItem('verificationUserId') || new URLSearchParams(window.location.search).get('userId');
    if (!userId) {
        window.location.href = '/signup';
        return;
    }

    // Set userId in forms
    document.getElementById('userId').value = userId;
    document.getElementById('userIdPhone').value = userId;

    // Check if in development mode
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
        showDevFallback();
    }

    // Initialize resend timers
    initResendTimers();

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab-btn, .verification-tab').forEach(el => {
                el.classList.remove('active');
            });
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + 'Verification';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Email Verification
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = document.getElementById('emailCode').value;
        await verifyCode('email', userId, code);
    });

    // Phone Verification
    phoneForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = document.getElementById('phoneCode').value;
        await verifyCode('phone', userId, code);
    });

    // Resend Email
    document.getElementById('resendEmail').addEventListener('click', async function(e) {
        e.preventDefault();
        await resendVerification('email', userId);
    });

    // Resend Phone
    document.getElementById('resendPhone').addEventListener('click', async function(e) {
        e.preventDefault();
        await resendVerification('phone', userId);
    });

    // Check initial verification status
    checkVerificationStatus(userId);

    // Functions
    async function verifyCode(type, userId, code) {
        const endpoint = type === 'email' ? 'verify-email' : 'verify-phone';
        const errorElement = document.getElementById(`${type}Error`);
        errorElement.style.display = 'none';

        try {
            const response = await fetch(`/api/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, code })
            });

            const data = await response.json();

            if (response.ok) {
                // Update UI
                updateVerificationStatus(type, true);
                checkAllVerified(userId);
            } else {
                errorElement.textContent = data.error || 'Verification failed';
                errorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Verification error:', error);
            errorElement.textContent = 'An error occurred during verification';
            errorElement.style.display = 'block';
        }
    }

    async function resendVerification(type, userId) {
        const timerElement = document.getElementById(`${type}ResendTimer`);
        const resendLink = document.getElementById(`resend${type.charAt(0).toUpperCase() + type.slice(1)}`);
        
        // Disable resend for 60 seconds
        resendLink.style.pointerEvents = 'none';
        let seconds = 60;
        
        timerElement.textContent = `(wait ${seconds}s)`;
        const timer = setInterval(() => {
            seconds--;
            timerElement.textContent = `(wait ${seconds}s)`;
            if (seconds <= 0) {
                clearInterval(timer);
                timerElement.textContent = '';
                resendLink.style.pointerEvents = 'auto';
            }
        }, 1000);

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, type })
            });

            const data = await response.json();
            
            if (!response.ok) {
                alert(data.error || 'Failed to resend verification');
            }
        } catch (error) {
            console.error('Resend error:', error);
            alert('Failed to resend verification');
        }
    }

    async function checkVerificationStatus(userId) {
        try {
            const response = await fetch(`/api/auth/check-verification?userId=${userId}`);
            const data = await response.json();
            
            if (response.ok) {
                if (data.emailVerified) updateVerificationStatus('email', true);
                if (data.phoneVerified) updateVerificationStatus('phone', true);
                checkAllVerified(userId);
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }

    function updateVerificationStatus(type, isVerified) {
        const statusElement = document.getElementById(`${type}Status`);
        if (isVerified) {
            statusElement.classList.add('verified');
            statusElement.querySelector('.status-icon').textContent = '✓';
            statusElement.querySelector('.status-text').textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Verified`;
        } else {
            statusElement.classList.remove('verified');
            statusElement.querySelector('.status-icon').textContent = '✗';
            statusElement.querySelector('.status-text').textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Not Verified`;
        }
    }

    function checkAllVerified(userId) {
        // In a real app, you would check with the server
        // For now, we'll check the UI elements
        const allVerified = 
            document.getElementById('emailStatus').classList.contains('verified') &&
            document.getElementById('phoneStatus').classList.contains('verified');
        
        if (allVerified) {
            document.querySelector('.verification-tabs').style.display = 'none';
            successMessage.style.display = 'block';
            localStorage.removeItem('verificationUserId');
        }
    }

    function initResendTimers() {
        // Initialize both timers to prevent immediate resend
        document.getElementById('emailResendTimer').textContent = '(wait 60s)';
        document.getElementById('phoneResendTimer').textContent = '(wait 60s)';
        
        setTimeout(() => {
            document.getElementById('emailResendTimer').textContent = '';
            document.getElementById('phoneResendTimer').textContent = '';
        }, 60000);
    }

    function showDevFallback() {
        // In a real app, you would get these from the server
        // For demo purposes, we'll show placeholders
        devFallback.style.display = 'block';
        document.getElementById('devEmailCode').textContent = '123456';
        document.getElementById('devPhoneCode').textContent = '654321';
    }

    
});