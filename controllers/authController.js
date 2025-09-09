const User = require('../models/User');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const { sendVerificationEmail } = require('../services/emailService');
const { generateVerificationCode } = require('../utils/helpers');

// Configure Twilio from .env
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function for SMS verification
const sendVerificationSMS = async (phone, code) => {
    try {
        await client.messages.create({
            body: `Your SkilledWork verification code is: ${code}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        return { success: true };
    } catch (error) {
        console.error('SMS sending error:', error);
        return { error: error.message };
    }
};

// Signup Controller
const signup = async (req, res) => {
    try {
        const { name, email, phone, password, role, location } = req.body;
        
        // Validate required fields
        if (!name || !email || !phone || !password || !location) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email or phone already exists',
                field: existingUser.email === email ? 'email' : 'phone'
            });
        }

        // Generate verification codes
        const emailCode = generateVerificationCode();
        const phoneCode = generateVerificationCode();

        const user = new User({
            name,
            email,
            phone,
            password,
            role: role || 'user',
            location,
            emailVerificationCode: emailCode,
            phoneVerificationCode: phoneCode
        });

        await user.save();

        // Send verifications (continue even if one fails)
        const verificationResults = await Promise.allSettled([
            sendVerificationEmail(user.email, emailCode),
            sendVerificationSMS(user.phone, phoneCode)
        ]);

        const errors = verificationResults
            .filter(result => result.status === 'rejected')
            .map(result => result.reason.message);

        if (errors.length > 0) {
            console.error('Verification sending errors:', errors);
        }

        res.status(201).json({ 
            message: 'User created successfully. Please verify your email and phone.',
            userId: user._id,
            codes: process.env.NODE_ENV === 'development' ? { emailCode, phoneCode } : undefined
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            error: 'An error occurred during signup',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Login Controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findByCredentials(email, password);
        
        if (!user.isVerified.email || !user.isVerified.phone) {
            return res.status(403).json({ 
                error: 'Please verify your email and phone first',
                userId: user._id,
                needsEmailVerification: !user.isVerified.email,
                needsPhoneVerification: !user.isVerified.phone
            });
        }

        const token = user.generateAuthToken();
        res.json({ 
            token,
            user: { 
                id: user._id,
                name: user.name, 
                role: user.role,
                email: user.email,
                phone: user.phone
            } 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ 
            error: 'Login failed. Check your credentials',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Email Verification Controller
const verifyEmail = async (req, res) => {
    try {
        const { userId, code } = req.body;
        
        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and verification code are required' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified.email) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        if (user.emailVerificationCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isVerified.email = true;
        user.emailVerificationCode = undefined;
        await user.save();

        res.json({ 
            message: 'Email verified successfully',
            needsPhoneVerification: !user.isVerified.phone
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Email verification failed' });
    }
};

// Phone Verification Controller
const verifyPhone = async (req, res) => {
    try {
        const { userId, code } = req.body;
        
        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and verification code are required' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified.phone) {
            return res.status(400).json({ error: 'Phone is already verified' });
        }

        if (user.phoneVerificationCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isVerified.phone = true;
        user.phoneVerificationCode = undefined;
        await user.save();

        res.json({ 
            message: 'Phone verified successfully',
            needsEmailVerification: !user.isVerified.email
        });

    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({ error: 'Phone verification failed' });
    }
};

// Resend Verification Controller
const resendVerification = async (req, res) => {
    try {
        const { userId, type } = req.body;
        
        if (!userId || !type) {
            return res.status(400).json({ error: 'User ID and verification type are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const code = generateVerificationCode();
        let result;

        if (type === 'email') {
            if (user.isVerified.email) {
                return res.status(400).json({ error: 'Email is already verified' });
            }
            
            user.emailVerificationCode = code;
            await user.save();
            result = await sendVerificationEmail(user.email, code);
            
        } else if (type === 'phone') {
            if (user.isVerified.phone) {
                return res.status(400).json({ error: 'Phone is already verified' });
            }
            
            user.phoneVerificationCode = code;
            await user.save();
            result = await sendVerificationSMS(user.phone, code);
            
        } else {
            return res.status(400).json({ error: 'Invalid verification type' });
        }

        if (result.error) {
            return res.status(500).json({ error: `Failed to resend ${type} verification` });
        }

        res.json({ 
            message: `Verification ${type === 'email' ? 'email' : 'SMS'} resent successfully`,
            code: process.env.NODE_ENV === 'development' ? code : undefined
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification' });
    }
};

// Check Verification Status
const checkVerification = async (req, res) => {
    try {
        const user = await User.findById(req.query.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            emailVerified: user.isVerified.email,
            phoneVerified: user.isVerified.phone
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check verification status' });
    }
};

module.exports = {
    signup,
    login,
    verifyEmail,
    verifyPhone,
    resendVerification,
    checkVerification,
    sendVerificationSMS
};