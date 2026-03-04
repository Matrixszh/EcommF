import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  data: Buffer;
  contentType: string;
  name: string;
  createdAt: Date;
}

const ImageSchema: Schema = new Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);
