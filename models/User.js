const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^\d{10}$/, 'Phone number must be 10 digits']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    isVerified: {
        email: { 
            type: Boolean, 
            default: false 
        },
        phone: { 
            type: Boolean, 
            default: false 
        }
    },
    emailVerificationCode: {
        type: String,
        select: false
    },
    phoneVerificationCode: {
        type: String,
        select: false
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'worker', 'admin'],
            message: 'Role must be either user, worker, or admin'
        },
        default: 'user',
        required: true
    },
    skills: {
        type: [String],
        default: [],
        validate: {
            validator: function(skills) {
                // Only validate skills if user is a worker
                return this.role !== 'worker' || skills.length > 0;
            },
            message: 'Workers must have at least one skill'
        }
    },
    location: {
        type: String,
        required: [true, 'Location is required']
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationCode;
            delete ret.phoneVerificationCode;
            return ret;
        }
    },
    toObject: {
        virtuals: true
    }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Update lastActive on login
userSchema.methods.updateLastActive = async function() {
    this.lastActive = Date.now();
    await this.save();
};

// JWT Token generation
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            role: this.role,
            email: this.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for worker profile (if exists)
userSchema.virtual('workerProfile', {
    ref: 'Worker',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Static method for finding by credentials
userSchema.statics.findByCredentials = async function(email, password) {
    const user = await this.findOne({ email }).select('+password');
    if (!user) throw new Error('Invalid credentials');
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error('Invalid credentials');
    
    return user;
};

// Auto-create worker profile when role changes to worker
userSchema.post('save', async function(doc, next) {
    if (doc.role === 'worker' && !doc.profileCompleted) {
        try {
            const workerExists = await mongoose.model('Worker').exists({ userId: doc._id });
            if (!workerExists) {
                await mongoose.model('Worker').create({
                    userId: doc._id,
                    profession: 'other',
                    skills: doc.skills,
                    location: doc.location,
                    hourlyRate: 300,
                    experienceYears: 1
                });
                doc.profileCompleted = true;
                await doc.save();
            }
        } catch (err) {
            console.error('Error creating worker profile:', err);
        }
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;