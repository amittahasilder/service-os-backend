import { Schema, model, Document, Types } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PAID' | 'CANCELLED';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  businessId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  invoiceNumber: { type: String, required: true, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'UNPAID', 'PAID', 'CANCELLED'],
    default: 'UNPAID'
  },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date }
}, { timestamps: true });

// প্রতিটি বিজনেসের জন্য ইনভয়েস নম্বর ইউনিক হবে
invoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);