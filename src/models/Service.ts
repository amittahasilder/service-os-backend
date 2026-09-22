import { Schema, model, Document, Types } from 'mongoose';

export interface IService extends Document {
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  durationMinutes: number; // যেমন ৩০ মিনিট বা ৬০ মিনিট
  price: number;
  isActive: boolean;
}

const serviceSchema = new Schema<IService>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  durationMinutes: { type: Number, required: true, min: 5 },
  price: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// একই বিজনেসে সার্ভিসের নাম ডুপ্লিকেট না হতে দেওয়া
serviceSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Service = model<IService>('Service', serviceSchema);