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
    ref: 'Owner',
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

appointmentSchema.index(
  { petId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } }
);

/* Hooks for observer */
// capture modified fields for document.save()
appointmentSchema.pre('save', function(next){
  if (!this.isNew) {
    // store the list of modified fields
    this.$locals.modified = this.modifiedPaths();
  }
  next();
});

appointmentSchema.post('save', async function(doc){
  if (this.isNew) return; // only on update
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

// for findOneAndUpdate
appointmentSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  //records the fields that are changing
  this._modifiedFields = Object.keys($set);
  next();
});

appointmentSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  const modified = this._modifiedFields || [];

  // Build changes with "to" values from doc and "from" from prior doc
  
  const changes = modified.map(field => ({ field }));

  bus.emit('appointment.updated', {
    doc,
    changes,
    source: 'findOneAndUpdate'
  });
});

module.exports = mongoose.model('Appointment', appointmentSchema);
