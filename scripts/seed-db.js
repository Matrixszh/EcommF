const mongoose = require('mongoose');
const { Schema } = mongoose;

// Hardcoded URI for standalone script (copied from .env.local)
const MONGODB_URI = 'mongodb+srv://zainhussaini9898_db_user:zartaq@cluster1.eu7brqg.mongodb.net/?appName=Cluster1';

// Define Schema inline to avoid TS/import issues
const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String, required: true }],
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const mockProducts = [
  {
    name: "Wireless Noise-Canceling Headphones",
    description: "Experience premium sound quality with our latest noise-canceling headphones. Perfect for travel and work.",
    price: 299.99,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"],
    category: "electronics",
    stock: 50,
    rating: 4.8
  },
  {
    name: "Minimalist Smart Watch",
    description: "Stay connected with style. Tracks health metrics, notifications, and battery lasts up to 7 days.",
    price: 199.50,
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"],
    category: "electronics",
    stock: 30,
    rating: 4.5
  },
  {
    name: "Ergonomic Office Chair",
    description: "Designed for comfort and productivity. Adjustable lumbar support and breathable mesh material.",
    price: 349.00,
    images: ["https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80"],
    category: "home",
    stock: 15,
    rating: 4.7
  },
  {
    name: "Running Shoes - Speed Pro",
    description: "Lightweight and durable running shoes for professional athletes and casual joggers alike.",
    price: 129.99,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
    category: "sports",
    stock: 100,
    rating: 4.6
  },
  {
    name: "Leather Weekend Bag",
    description: "Handcrafted leather bag, spacious enough for a weekend getaway. Stylish and durable.",
    price: 249.00,
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"],
    category: "clothing",
    stock: 20,
    rating: 4.9
  },
  {
    name: "Mechanical Keyboard",
    description: "Tactile switches and RGB lighting for the ultimate typing and gaming experience.",
    price: 149.99,
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b91a91e?w=800&q=80"],
    category: "electronics",
    stock: 40,
    rating: 4.7
  }
];

async function seed() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing existing products...');
    await Product.deleteMany({});

    console.log('Seeding new products...');
    const result = await Product.insertMany(mockProducts);
    
    console.log(`Successfully seeded ${result.length} products!`);
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

seed();
