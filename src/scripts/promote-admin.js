/**
 * Promotes an existing admin account to SUPER_ADMIN.
 *
 * Why this exists: only a SUPER_ADMIN can see/use the "All Admins" section
 * or manage other admin accounts (by design — see admin.route.js). If your
 * very first admin account ended up as SUB_ADMIN (the schema's default),
 * there's no way to promote it from inside the dashboard — a SUB_ADMIN
 * can't grant themselves SUPER_ADMIN, and nobody else exists yet to do it
 * for them. This script is the one-time way out of that lock.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/promote-admin.js you@example.com
 *
 * Requires the same .env as the server (MONGO_URI).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../model/admin.model');

async function run() {
    const email = process.argv[2];

    if (!email) {
        console.error('Usage: node src/scripts/promote-admin.js <admin-email>');
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set — check your .env file.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected.');

    const admin = await Admin.findOne({ email, isDelete: false });

    if (!admin) {
        console.error(`No admin found with email "${email}".`);
        await mongoose.disconnect();
        process.exit(1);
    }

    if (admin.role === 'SUPER_ADMIN') {
        console.log(`${email} is already a SUPER_ADMIN. Nothing to do.`);
    } else {
        admin.role = 'SUPER_ADMIN';
        await admin.save();
        console.log(`Done — ${email} is now a SUPER_ADMIN.`);
        console.log('Log out and back in on the dashboard for the change to take effect (the role is read fresh on every login/profile fetch, but your current session may have it cached client-side).');
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
