require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_portal';
(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const School = require('./src/models/School').default;
    const admin = await School.findOne({ 'adminInfo.email': 'admin@demo-school.com' }).lean();
    console.log('ADMIN_FOUND', !!admin);
    console.log(admin);
    const school = await School.findOne({ 'schoolInfo.email': 'demo@school.com' }).lean();
    console.log('SCHOOL_FOUND', !!school);
    console.log(school);
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await mongoose.disconnect();
  }
})();
