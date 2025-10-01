// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const Appointment = require('../models/AppointmentModel');
const { protect } = require('../middleware/authMiddleware');

// Helper function to check appointment conflicts
async function findConflict({ petId, date, time, excludeId }) {
  const query = { petId, date, time, status: 'scheduled' };
  if (excludeId) query._id = { $ne: excludeId };
  return Appointment.exists(query);
}

/**
 * GET /appointments
 * Get all appointments with optional filters
 */
router.get('/', protect, async (req, res) => {
  try {
    const { ownerId, petId, status, date } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (ownerId) filter.ownerId = ownerId;
    if (petId) filter.petId = petId;
    if (status) filter.status = status;
    if (date) filter.date = date;

    // Get appointments and populate owner and pet info
    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .populate('ownerId', 'name phone')  // Get owner name from Owner model
      .populate('petId', 'name type');

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /appointments/summary
 * Get summary of appointments by date
 */
router.get('/summary', protect, async (req, res) => {
  try {
    let { from, to } = req.query;

    // Default to next 7 days if no dates provided
    if (!from || !to) {
      const today = new Date();
      const toDate = new Date();
      toDate.setDate(today.getDate() + 6);
      from = today.toISOString().slice(0, 10);
      to = toDate.toISOString().slice(0, 10);
    }

    const filter = { date: { $gte: from, $lte: to } };

    // Aggregate appointments by date and status
    const summary = await Appointment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { date: "$date", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Format summary data
    const map = {};
    summary.forEach(item => {
      const date = item._id.date;
      if (!map[date]) {
        map[date] = { date, total: 0, scheduled: 0, completed: 0, cancelled: 0 };
      }
      map[date].total += item.count;
      map[date][item._id.status] = item.count;
    });

    // Create array for all dates in range
    const result = [];
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      result.push(map[dateStr] || { date: dateStr, total: 0, scheduled: 0, completed: 0, cancelled: 0 });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /appointments/:id
 * Get single appointment by ID
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await Appointment.findById(req.params.id)
      .populate('ownerId', 'name phone')
      .populate('petId', 'name type');
    
    if (!item) return res.status(404).json({ message: 'Appointment not found' });
    
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /appointments
 * Create new appointment - use ownerId from form
 */
router.post('/', protect, async (req, res) => {
  try {
    const { petId, ownerId, date, time, reason } = req.body;
    
    // Validate required fields
    if (!petId || !ownerId || !date || !time) {
      return res.status(400).json({ message: 'petId, ownerId, date, time are required' });
    }

    // Check for appointment conflicts
    const conflict = await findConflict({ petId, date, time });
    if (conflict) {
      return res.status(409).json({ message: 'Double booking detected' });
    }

    // Create new appointment
    const appt = new Appointment({ petId, ownerId, date, time, reason });
    const saved = await appt.save();
    
    // Populate owner and pet info before sending response
    await saved.populate([
      { path: 'ownerId', select: 'name phone' },
      { path: 'petId', select: 'name type' }
    ]);
    
    res.status(201).json(saved);
  } catch (err) {
    // Handle duplicate appointment error
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

/**
 * PATCH /appointments/:id
 * Update existing appointment
 */
router.patch('/:id', protect, async (req, res) => {
  try {
    const current = await Appointment.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Appointment not found' });

    // Get values from request or keep current values
    const nextPetId = req.body.petId ?? String(current.petId);
    const nextDate = req.body.date ?? current.date;
    const nextTime = req.body.time ?? current.time;
    const nextStatus = req.body.status ?? current.status;

    // Check for conflicts if status is scheduled
    if (nextStatus === 'scheduled') {
      const conflict = await findConflict({
        petId: nextPetId,
        date: nextDate,
        time: nextTime,
        excludeId: current._id
      });
      if (conflict) {
        return res.status(409).json({ message: 'Double booking detected' });
      }
    }

    // Update appointment fields
    Object.assign(current, req.body);
    const saved = await current.save();
    
    // Populate before sending response
    await saved.populate([
      { path: 'ownerId', select: 'name phone' },
      { path: 'petId', select: 'name type' }
    ]);
    
    res.json(saved);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

/**
 * PATCH /appointments/:id/cancel
 * Cancel an appointment
 */
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    // Update status to cancelled
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    ).populate('ownerId', 'name phone')
     .populate('petId', 'name type');

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PATCH /appointments/:id/complete
 * Mark appointment as completed
 */
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    // Cannot complete a cancelled appointment
    if (appt.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot complete a cancelled appointment' });
    }

    // Update status to completed
    appt.status = 'completed';
    await appt.save();
    
    // Populate before sending response
    await appt.populate([
      { path: 'ownerId', select: 'name phone' },
      { path: 'petId', select: 'name type' },
    ]);

    res.json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * DELETE /appointments/:id
 * Delete an appointment
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /appointments/:id
 * Full update of appointment
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const current = await Appointment.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Appointment not found' });

    const body = req.body || {};
    const petId = body.petId || String(current.petId);
    const date = body.date || current.date;
    const time = body.time || current.time;
    const status = body.status || current.status;

    // Check for conflicts if status is scheduled
    if (status === 'scheduled') {
      const conflict = await findConflict({
        petId, date, time, excludeId: req.params.id
      });
      if (conflict) {
        return res.status(409).json({ message: 'Double booking detected' });
      }
    }

    // Update appointment
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id, 
      body, 
      { new: true }
    ).populate('ownerId', 'name phone')
     .populate('petId', 'name type');
     
    res.json(updated);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;