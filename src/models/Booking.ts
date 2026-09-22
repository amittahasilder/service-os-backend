import { Schema, model, Document, Types } from 'mongoose';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface IBooking extends Document {
  businessId: Types.ObjectId;
  serviceId: Types.ObjectId;
  staffId?: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
}

const bookingSchema = new Schema<IBooking>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  staffId: { type: Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  customerPhone: { type: String, required: true, trim: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  totalPrice: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PAID', 'REFUNDED'],
    default: 'UNPAID'
  },
  notes: { type: String }
}, { timestamps: true });

// কুয়েরি অপ্টিমাইজেশন: একই বিজনেসের নির্দিষ্ট সময়ে বুকিং দ্রুত খোঁজা
bookingSchema.index({ businessId: 1, startTime: 1, endTime: 1 });

export const Booking = model<IBooking>('Booking', bookingSchema);