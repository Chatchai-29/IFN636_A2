// subscribes to the event bus singleton and creates a notification with a message
const Notification = require('../models/NotificationModel');
// fields in message
const FIELD_LABELS = {
    date: 'date',
    time: 'time',
    status: 'status',
    reason: 'reason'
};

function buildMessage(doc, changes) {
    const parts = changes
    .filter(c => FIELD_LABELS[c.field])
    .map(c => FIELD_LABELS[c.field])
    .join(', ');

    const petName = doc?.petId?.name || 'Pet';
    const ownerName = doc?.ownerId?.name || 'Owner';

    if(!parts) return `Appointment updated for ${petName}.`;
    return `Appointment ${parts} updated for ${petName} (${ownerName}).`;
}

async function createNotification(payload) {
    const { doc, changes } = payload;
    let appt = doc;
    if (!doc.populated || typeof doc.populated !== 'function' || !doc.populated('ownerId') || !doc.populated('petId')) {
        appt = await doc.populate([
            { path: 'ownerId', select: 'name' },
            { path: 'petId', select: 'name'},
        ]);
    }

    const message = buildMessage(appt, changes);

    await Notification.create({
        type: 'appointment.updated',
        appointmentId: appt._id,
        ownerId: appt.ownerId?._id || appt.ownerId,
        petId: appt.petId?._id || appt.petId,
        changes,
        message
    });
}

module.exports = function registerNotificationListener(bus) {
    bus.on('appointment.updated', (payload) => {
        createNotification(payload).catch(err => {
            console.error('notificationListener failed to create notification:', err);
        });
    });
};
