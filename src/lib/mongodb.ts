import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // If connection exists AND is still open, reuse it
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  // Reset stale connection state
  if (cached.conn && cached.conn.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased for Vercel cold starts
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose.connection;
    }).catch(err => {
      console.error('MongoDB connection error:', err);
      cached.promise = null; // ✅ Reset on failure so next request retries
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.promise = null; // ✅ Reset after success so reconnects work
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;