const { Queue } = require('bullmq');
const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

// Standard Redis connection configuration
const connection = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
});

// Configure the main Call Queue
const callQueue = new Queue('call-queue', { connection });

console.log('✅ BullMQ Call Queue initialized');

module.exports = { callQueue, connection };
