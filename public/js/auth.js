document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // SIGNUP FORM HANDLER
    // ======================
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 1. Collect and validate form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.replace(/\D/g, ''), // Remove non-digits
                password: document.getElementById('password').value,
                location: document.getElementById('location').value.trim()
                // Note: Removed 'role' field since backend rejects it
            };

            // 2. Client-side validation
            const errors = [];
            if (!formData.name) errors.push('Name is required');
            if (!formData.email.includes('@')) errors.push('Valid email required');
            if (formData.phone.length < 10) errors.push('Phone must be 10+ digits');
            if (formData.password.length < 6) errors.push('Password needs 6+ characters');
            if (!formData.location) errors.push('Location is required');

            if (errors.length > 0) {
                alert('Please fix:\n' + errors.join('\n'));
                return;
            }

            try {
                // 3. Debug: Log what we're sending
                console.log('Submitting:', JSON.stringify(formData, null, 2));

                // 4. Send to server
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                // 5. Handle response
                const data = await response.json();
                console.log('Server response:', data);

                if (!response.ok) {
                    // Show server validation errors if available
                    const serverErrors = data.errors || [data.error || 'Signup failed'];
                    throw new Error(serverErrors.join('\n'));
                }

                // 6. Success - redirect to verification
                if (data.userId) {
                    localStorage.setItem('verificationUserId', data.userId);
                    window.location.href = '/verify';
                } else {
                    throw new Error('Missing user ID in response');
                }

            } catch (error) {
                console.error('Signup failed:', error);
                alert(`Signup error:\n${error.message}`);
            }
        });
    }

    // ======================
    // LOGIN FORM HANDLER
    // ======================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };

            // Basic validation
            if (!formData.email || !formData.password) {
                alert('Please fill in both fields');
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Invalid credentials');
                }

                // Store auth data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect based on role (if your backend provides it)
                window.location.href = data.user?.role === 'worker' 
                    ? '/worker-dashboard' 
                    : '/find-workers';

            } catch (error) {
                console.error('Login error:', error);
                alert(`Login failed: ${error.message}`);
            }
        });
    }

    // ======================
    // DEBUGGING UTILITIES
    // ======================
    // Log stored auth data (for debugging)
    console.log('Stored token:', localStorage.getItem('token'));
    console.log('Stored user:', JSON.parse(localStorage.getItem('user') || '{}'));
});