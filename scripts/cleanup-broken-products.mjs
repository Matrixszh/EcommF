import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const ProductSchema = new mongoose.Schema({
  images: [String]
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function cleanupBrokenProducts() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Find products with images starting with /api/images
    const query = {
      images: { $elemMatch: { $regex: /^\/api\/images/ } }
    };

    const count = await Product.countDocuments(query);
    console.log(`Found ${count} products with broken image URLs.`);

    if (count > 0) {
      const result = await Product.deleteMany(query);
      console.log(`Deleted ${result.deletedCount} broken products.`);
    } else {
      console.log('No broken products found.');
    }

  } catch (error) {
    console.error('Error cleaning up products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupBrokenProducts();
