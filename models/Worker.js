const mongoose = require('mongoose');
const { Schema } = mongoose;

const workerSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    profession: {
        type: String,
        required: true,
        enum: ['driver', 'painter', 'plumber', 'electrician', 'carpenter', 'cleaner', 'other'],
        default: 'other'
    },
    customProfession: {
        type: String,
        trim: true
    },
    skills: {
        type: [String],
        required: true,
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: 'At least one skill is required'
        }
    },
    experienceYears: {
        type: Number,
        required: true,
        min: 0,
        max: 50
    },
    photo: {
        url: String,
        publicId: String
    },
    location: {
        type: String,
        required: true
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 100,
        max: 5000
    },
    available: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    completedJobs: {
        type: Number,
        default: 0
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Automatic worker profile creation middleware
workerSchema.post('save', async function(doc) {
    // Update user role if not already set
    await mongoose.model('User').findByIdAndUpdate(
        doc.userId,
        { $set: { role: 'worker' } },
        { new: true }
    );
});

// Indexes
workerSchema.index({ profession: 1, location: 1, skills: 1 });
workerSchema.index({ userId: 1 }, { unique: true });
workerSchema.index({ rating: -1 });
workerSchema.index({ hourlyRate: 1 });

module.exports = mongoose.model('Worker', workerSchema);