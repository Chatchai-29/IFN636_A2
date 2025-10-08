let getAppointmentSummary;
try {
  ({ getAppointmentSummary } = require('../utils/appointmentUtils'));
} catch (e) {
  getAppointmentSummary = function (appt) {
    if (!appt) return {};
    return {
      id: appt._id || appt.id,
      ownerId: appt.ownerId,
      petId: appt.petId,
      status: appt.status,
      date: appt.date,
      time: appt.time,
      reason: appt.reason,
      diagnosis: appt.diagnosis,
    };
  };
}

const Appointment = require('../models/AppointmentModel');

function ok(res, body, code = 200) { return res.status(code).json(body); }
function created(res, body) { return ok(res, body, 201); }
function notFound(res, message = 'Appointment not found') { return res.status(404).json({ message }); }
function badRequest(res, message = 'Bad Request') { return res.status(400).json({ message }); }

/**
 * POST /api/appointments
 * body: { ownerId, petId, date, time, reason? }
 */
async function createAppointment(req, res) {
  try {
    const { ownerId, petId, date, time, reason } = req.body || {};
    if (!ownerId || !petId || !date || !time) {
      return badRequest(res, 'ownerId, petId, date, time are required');
    }
    const appt = await Appointment.create({
      ownerId,
      petId,
      date,
      time,
      reason: reason || '',
      status: 'PENDING',
    });
    return created(res, getAppointmentSummary(appt));
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}

/**
 * GET /api/appointments  
 */
async function getAppointments(req, res) {
  try {
    const { ownerId } = req.query || {};
    const q = {};
    if (ownerId) q.ownerId = ownerId;

    if (!ownerId && req.user && req.user.id && (req.originalUrl || '').includes('/mine')) {
      q.ownerId = req.user.id;
    }

    // query chainable
    let query = Appointment.find(q);
    if (req.query?.sort) query = query.sort(req.query.sort);
    if (req.query?.limit) query = query.limit(Number(req.query.limit));
    if (req.query?.skip) query = query.skip(Number(req.query.skip));

    const rows = await query.lean();
    const summaries = rows.map(getAppointmentSummary);
    return ok(res, summaries);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}

/**
 * PATCH /api/appointments/:id
 * body: { status?, reason?, diagnosis? }
 */
async function updateAppointment(req, res) {
  try {
    const { id } = req.params || {};
    const appt = await Appointment.findById(id);
    if (!appt) return notFound(res);

    const { status, reason, diagnosis } = req.body || {};
    if (typeof status !== 'undefined') appt.status = status;
    if (typeof reason !== 'undefined') appt.reason = reason;
    if (typeof diagnosis !== 'undefined') appt.diagnosis = diagnosis;

    await appt.save();
    return ok(res, getAppointmentSummary(appt), 200);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}

/**
 * PATCH /api/appointments/:id/complete
 */
async function completeAppointment(req, res) {
  try {
    const { id } = req.params || {};
    const appt = await Appointment.findById(id);
    if (!appt) return notFound(res);

    appt.status = 'COMPLETED';
    await appt.save();
    return ok(res, getAppointmentSummary(appt));
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}

/**
 * PATCH /api/appointments/:id/cancel
 */
async function cancelAppointment(req, res) {
  try {
    const { id } = req.params || {};
    const appt = await Appointment.findById(id);
    if (!appt) return notFound(res);

    appt.status = 'CANCELLED';
    await appt.save();
    return ok(res, getAppointmentSummary(appt));
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
}

async function updateStatus(req, res) {
  const next = (req.body || {}).status;
  if (!next) return badRequest(res, 'status is required');
  // reuse generic update
  return updateAppointment(req, res);
}

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  updateStatus,
  completeAppointment,
  cancelAppointment,

  create: createAppointment,
  addAppointment: createAppointment,
  add: createAppointment,

  listAppointments: getAppointments,
  getAllAppointments: getAppointments,
  getAll: getAppointments,
  index: getAppointments,

  patchAppointment: updateAppointment,
  setStatus: updateStatus,
  complete: completeAppointment,
  cancel: cancelAppointment,
};
