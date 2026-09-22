import { Schema, model, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  slug: string;
  ownerId?: Types.ObjectId;
  currency: string;
}

const businessSchema = new Schema<IBusiness>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  currency: { type: String, default: 'USD' }
}, { timestamps: true });

export const Business = model<IBusiness>('Business', businessSchema);