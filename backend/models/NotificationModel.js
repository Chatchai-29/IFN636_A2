const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: { type: String, required: true }, // for example 'appointment.updated
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true},
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner'},
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet'},

    // store what changed to make displaying quicker
    changes: [
        {
            field: String, // date, time, status, for example
            from: mongoose.Schema.Types.Mixed,
            to: mongoose.Schema.Types.Mixed
            
        }
    ],

    message: { type: String }, // summary that is readable by a person
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);