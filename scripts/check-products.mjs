import mongoose from 'mongoose';
import path from 'path';

// Load env vars
// config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

// Define a minimal Product schema
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const checkProducts = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    const idsToCheck = [
      '69a7676af8cb4baee7b9f7aa',
      '69a7676af8cb4baee7b9f7ad',
      '69a7676af8cb4baee7b9f7ab',
      '69a7676af8cb4baee7b9f7a9',
      '69a7676af8cb4baee7b9f7ac'
    ];

    console.log('Checking for products with IDs:', idsToCheck);

    const products = await Product.find({ _id: { $in: idsToCheck } });

    console.log(`Found ${products.length} products out of ${idsToCheck.length} requested.`);

    products.forEach(p => {
      console.log(`Found: ${p._id} - ${p.name}`);
    });

    const foundIds = products.map(p => p._id.toString());
    const missingIds = idsToCheck.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      console.log('Missing IDs:', missingIds);
    } else {
      console.log('All requested products found.');
    }

  } catch (error) {
    console.error('Error checking products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

checkProducts();
