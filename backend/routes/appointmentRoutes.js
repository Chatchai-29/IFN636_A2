// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const Appointment = require('../models/AppointmentModel');
const { protect } = require('../middleware/authMiddleware');

async function findConflict({ petId, date, time, excludeId }) {
  const query = { petId, date, time, status: 'scheduled' };
  if (excludeId) query._id = { $ne: excludeId };
  return Appointment.exists(query);
}

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { ownerId, petId, status, date } = req.query;
    const filter = {};
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }
    
    if (ownerId) filter.ownerId = ownerId;
    if (petId) filter.petId = petId;
    if (status) filter.status = status;
    if (date) filter.date = date;

    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .populate('ownerId', 'name phone')
      .populate('petId', 'name type');

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      const today = new Date();
      const toDate = new Date();
      toDate.setDate(today.getDate() + 6);
      from = today.toISOString().slice(0, 10);
      to = toDate.toISOString().slice(0, 10);
    }

    const filter = { date: { $gte: from, $lte: to } };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const summary = await Appointment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { date: "$date", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ]);

    const map = {};
    summary.forEach(item => {
      const date = item._id.date;
      if (!map[date]) {
        map[date] = { date, total: 0, scheduled: 0, completed: 0, cancelled: 0 };
      }
      map[date].total += item.count;
      map[date][item._id.status] = item.count;
    });

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

router.get('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const item = await Appointment.findOne(filter)
      .populate('ownerId', 'name phone')
      .populate('petId', 'name type');
      
    if (!item) return res.status(404).json({ message: 'Appointment not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { petId, ownerId, date, time, reason } = req.body;
    if (!petId || !ownerId || !date || !time) {
      return res.status(400).json({ message: 'petId, ownerId, date, time are required' });
    }

    const conflict = await findConflict({ petId, date, time });
    if (conflict) {
      return res.status(409).json({
        message: 'Double booking detected'
      });
    }

    const appt = new Appointment({ 
      userId: req.user._id,
      petId, 
      ownerId, 
      date, 
      time, 
      reason 
    });
    const saved = await appt.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const current = await Appointment.findOne(filter);
    if (!current) return res.status(404).json({ message: 'Appointment not found' });

    const nextPetId = req.body.petId ?? String(current.petId);
    const nextDate = req.body.date ?? current.date;
    const nextTime = req.body.time ?? current.time;
    const nextStatus = req.body.status ?? current.status;

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

    Object.assign(current, req.body);
    const saved = await current.save();
    res.json(saved);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const updated = await Appointment.findOneAndUpdate(
      filter,
      { status: 'cancelled' },
      { new: true }
    ).populate('ownerId', 'name phone')
     .populate('petId', 'name type');

    if (!updated) return res.status(404).json({ message: 'Appointment not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      return res.status(403).json({ message: 'Only admin/vet can complete appointments' });
    }

    const appt = await Appointment.findOne(filter);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    if (appt.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot complete a cancelled appointment' });
    }

    appt.status = 'completed';
    await appt.save();

    await appt.populate([
      { path: 'ownerId', select: 'name phone' },
      { path: 'petId', select: 'name type' },
    ]);

    res.json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const body = req.body || {};
    const current = await Appointment.findOne(filter);
    if (!current) return res.status(404).json({ message: 'Appointment not found' });

    const petId = body.petId || String(current.petId);
    const date = body.date || current.date;
    const time = body.time || current.time;
    const status = body.status || current.status;

    if (status === 'scheduled') {
      const conflict = await findConflict({
        petId, date, time, excludeId: req.params.id
      });
      if (conflict) {
        return res.status(409).json({ message: 'Double booking detected' });
      }
    }

    const updated = await Appointment.findOneAndUpdate(filter, body, { new: true });
    res.json(updated);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Double booking detected' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    if (req.user.role === 'owner') {
      filter.userId = req.user._id;
    }

    const deleted = await Appointment.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;