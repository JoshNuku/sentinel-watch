/**
 * Seed Script - Create Demo User
 * Run: ts-node src/scripts/seedUser.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_ATLAS_USERNAME}:${process.env.MONGODB_ATLAS_PASSWORD}@cluster0.evxv4jy.mongodb.net/orion?retryWrites=true&w=majority&appName=Cluster0`;

//connect to mongo atlas

async function seedUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'admin@orion.gh' });
    
    if (existingUser) {
      console.log('ℹ️  Demo user already exists');
      process.exit(0);
    }

    // Create demo admin user
    await User.create({
      email: 'admin@orion.gh',
      password: 'password',
      name: 'ORION Admin',
      role: 'admin',
    });

    console.log('✅ Demo user created successfully:');
    console.log('   Email: admin@orion.gh');
    console.log('   Password: password');
    console.log('   Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user:', error);
    process.exit(1);
  }
}

seedUser();
