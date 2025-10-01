// backend/models/ownerModel.js
const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  // Optional: Add email to link with User account
  email: { 
    type: String, 
    unique: true, 
    sparse: true  // Allow null values but keep unique when exists
  }
}, { timestamps: true });

module.exports = mongoose.model('Owner', ownerSchema);