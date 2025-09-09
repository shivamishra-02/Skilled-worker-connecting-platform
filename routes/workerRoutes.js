const express = require('express');
const router = express.Router();
const multer = require('multer');
const Worker = require('../models/Worker');
const { cloudinary } = require('../utils/cloudinary');
const { auth } = require('../middlewares/auth');

// Multer configuration
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Worker search endpoint
router.get('/', async (req, res, next) => {
  try {
    const { profession, location, skills } = req.query;
    const filter = {};
    
    if (profession) filter.profession = profession.toLowerCase();
    if (location) filter.location = new RegExp(location, 'i');
    if (skills) filter.skills = { $in: skills.split(',').map(s => new RegExp(s.trim(), 'i')) };

    const workers = await Worker.find(filter)
      .select('-__v -createdAt -updatedAt')
      .sort({ rating: -1 });

    res.json({ success: true, count: workers.length, workers });
  } catch (error) {
    next(error);
  }
});

// Profile completion endpoint
router.post('/profile', 
  auth,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.body.data) {
        return res.status(400).json({ success: false, message: 'Profile data is required' });
      }

      const profileData = JSON.parse(req.body.data);
      
      // Validate skills
      if (!profileData.skills || profileData.skills.length < 3) {
        return res.status(400).json({ 
          success: false,
          message: 'Please add at least 3 skills' 
        });
      }

      // Handle file upload
      let photo = {};
      if (req.file) {
        const uploadResponse = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          { folder: 'skilledwork/workers', width: 500, height: 500, crop: 'fill' }
        );
        photo = { url: uploadResponse.secure_url, publicId: uploadResponse.public_id };
      }

      // Update worker profile
      const worker = await Worker.findOneAndUpdate(
        { userId: req.user._id },
        { 
          ...profileData,
          photo,
          profession: profileData.customProfession || profileData.profession,
          userId: req.user._id
        },
        { new: true, upsert: true }
      );

      res.json({ 
        success: true,
        worker: {
          _id: worker._id,
          profession: worker.profession,
          skills: worker.skills,
          photo: worker.photo?.url
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Worker details endpoint
router.get('/:id', async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.json({ success: true, worker });
  } catch (error) {
    next(error);
  }
});

module.exports = router;