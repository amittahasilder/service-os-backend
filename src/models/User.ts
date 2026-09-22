import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'OWNER' | 'STAFF' | 'CLIENT';

export interface IUser extends Document {
  businessId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

const userSchema = new Schema<IUser>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['OWNER', 'STAFF', 'CLIENT'], default: 'STAFF' }
}, { timestamps: true });

userSchema.index({ businessId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);