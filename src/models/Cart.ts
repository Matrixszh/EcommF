import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  productId: string;
  quantity: number;
}

export interface ICart extends Document {
  userId: string;
  items: ICartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const CartSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true }, // Using firebaseUid
  items: [CartItemSchema],
}, { timestamps: true });

export default mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);
