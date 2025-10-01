const express = require('express');
const router = express.Router();
const Appointment = require('../models/AppointmentModel');
const { protect } = require('../middleware/authMiddleware');

/**
 * GET /history
 * Owner sees only their appointments, admin/vet see all
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      q = '',
      from = '',
      to = '',
      status = '',
      page = '1',
      limit = '20',
    } = req.query;

    const match = {};
    
    // Owner filter: only their appointments
    if (req.user.role === 'owner') {
      match.ownerId = req.user._id;
    }
    // Admin/vet: no filter - see all appointments
    
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = from;
      if (to) match.date.$lte = to;
    }
    if (status) {
      match.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limNum;

    const base = await Appointment.find(match)
      .sort({ date: -1, time: -1 })
      .populate('ownerId', 'name phone')
      .populate('petId', 'name type')
      .lean();

    // Text filter
    const needle = (q || '').trim().toLowerCase();
    const filtered = needle
      ? base.filter(appt => {
          const ownerName = (appt.ownerId?.name || '').toLowerCase();
          const ownerPhone = (appt.ownerId?.phone || '').toLowerCase();
          const petName = (appt.petId?.name || '').toLowerCase();
          return (
            ownerName.includes(needle) ||
            ownerPhone.includes(needle) ||
            petName.includes(needle)
          );
        })
      : base;

    const items = filtered.slice(skip, skip + limNum);

    return res.json({
      items,
      page: pageNum,
      limit: limNum,
      total: filtered.length,
      hasMore: skip + items.length < filtered.length,
    });
  } catch (err) {
    console.error('[history] error:', err);
    return res.status(500).json({ message: 'History search failed' });
  }
});

module.exports = router;