const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const User = require('../models/User');

mongoose.set('strictQuery', true);

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

function parseArgs() {
  const out = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    const v = args[i + 1];
    if (k && k.startsWith('--')) out[k.slice(2)] = v;
  }
  return out;
}

async function main() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI/MONGODB_URI in backend/.env');
  }

  const { email, role } = parseArgs();
  const targetEmail = process.env.TARGET_EMAIL || email || 'admin@gmail.com';
  const targetRole = process.env.TARGET_ROLE || role || 'admin';

  console.log('[connect]', MONGO_URI.replace(/\/\/.*@/, '//<redacted>@'));
  await mongoose.connect(MONGO_URI);

  try {
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      throw new Error(`ไม่พบผู้ใช้ email: ${targetEmail}`);
    }
    user.role = targetRole;
    await user.save();

    console.log('[updated]', { email: user.email, role: user.role });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exitCode = 1;
});
