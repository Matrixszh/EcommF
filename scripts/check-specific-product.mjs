import mongoose from 'mongoose';
import path from 'path';

// Load env vars
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined. Run with --env-file=.env.local');
  process.exit(1);
}

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  images: [String]
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function checkProduct() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // The ID from user's error message: /product/69a7676af8cb4baee7b9f7aa
    const id = '69a7676af8cb4baee7b9f7aa';
    console.log(`Checking for product ID: ${id}`);

    // Check if ID is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Invalid ObjectId format: ${id}`);
    }

    const product = await Product.findById(id);

    if (product) {
      console.log('✅ Product FOUND:');
      console.log(JSON.stringify(product, null, 2));
    } else {
      console.log('❌ Product NOT FOUND.');

      // List all products to see what's there
      const allProducts = await Product.find({}, '_id name').limit(10);
      console.log('\nFirst 10 products in DB:');
      allProducts.forEach(p => console.log(`${p._id} - ${p.name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkProduct();
