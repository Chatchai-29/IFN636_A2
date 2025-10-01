require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/AppointmentModel');
const User = require('../models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.log('No admin user found');
    return;
  }

  const result = await Appointment.updateMany(
    { userId: { $exists: false } },
    { $set: { userId: adminUser._id } }
  );

  console.log(`Updated ${result.modifiedCount} appointments`);
  await mongoose.connection.close();
}

migrate().catch(console.error);