// backend/models/AppointmentModel.js
const mongoose = require('mongoose');
const bus = require('../events/bus');

const appointmentSchema = new mongoose.Schema({
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',  // This must reference Owner model, not User
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  }
}, { timestamps: true });

// Prevent duplicate appointments for same pet at same time
appointmentSchema.index(
  { petId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } }
);

// Hook to track changes before saving
appointmentSchema.pre('save', function(next){
  if (!this.isNew) {
    this.$locals.modified = this.modifiedPaths();
  }
  next();
});

// Hook to emit event after saving
appointmentSchema.post('save', async function(doc){
  if (this.isNew) return;
  const modified = this.$locals.modified || [];

  const changes = modified.map((field) => {
    return {field};
  });

  bus.emit('appointment.updated', {
    doc,
    changes,
    source: 'save'
  });
});

// Hook for findOneAndUpdate
appointmentSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  this._modifiedFields = Object.keys($set);
  next();
});

appointmentSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  const modified = this._modifiedFields || [];
  const changes = modified.map(field => ({ field }));

  bus.emit('appointment.updated', {
    doc,
    changes,
    source: 'findOneAndUpdate'
  });
});

module.exports = mongoose.model('Appointment', appointmentSchema);