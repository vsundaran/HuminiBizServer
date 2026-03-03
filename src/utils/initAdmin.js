const Admin = require('../models/Admin');
const dotenv = require('dotenv');

dotenv.config();

const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL is not defined in .env file. Skipping admin initialization.');
      return;
    }

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      await Admin.create({ email: adminEmail, status: 'ACTIVE' });
      console.log(`[Admin Init] Admin account initialized for: ${adminEmail}`);
    } else {
      console.log(`[Admin Init] Admin account already exists for: ${adminEmail}`);
    }
  } catch (error) {
    console.error('[Admin Init] Failed to initialize admin:', error.message);
  }
};

module.exports = initAdmin;
