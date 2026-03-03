require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./src/models/Organization');
const OrganizationDomain = require('./src/models/OrganizationDomain');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const importData = async () => {
    try {
        await connectDB();
        
        // Clear existing test data
        // await Organization.deleteMany();
        // await OrganizationDomain.deleteMany();
        // await User.deleteMany();

        // 1. Create Organization
        const org = await Organization.create({
            name: 'Arus Innovation Pvt Ltd',
            status: 'ACTIVE'
        });

        // 2. Create Domain mapping
        await OrganizationDomain.create({
            domain: 'arus.sg',
            organizationId: org._id
        });

        console.log('✅ Base test data imported successfully!');
        console.log('You can now test logging in with any email under the @acme.com domain (e.g., john@acme.com)');
        process.exit();
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
}

importData();
