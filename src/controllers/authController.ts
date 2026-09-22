import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Business } from '../models/Business.js';
import { User } from '../models/User.js';
import { registerSchema, loginSchema } from '../utils/validators.js';

const generateToken = (userId: string, businessId: string, role: string): string => {
  return jwt.sign(
    { userId, businessId, role },
    process.env.JWT_SECRET || 'super_secret_serviceos_key_2026',
    { expiresIn: '7d' }
  );
};

export const registerOwner = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { businessName, name, email, password } = validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    // বিজনেস স্লাগ জেনারেট করা
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);

    // ১. প্রথমে বিজনেস রেকর্ড তৈরি
    const business = await Business.create({
      name: businessName,
      slug,
      currency: 'USD'
    });

    // ২. পাসওয়ার্ড হ্যাশ করা
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ৩. ওনার ইউজার তৈরি
    const user = await User.create({
      businessId: business._id,
      name,
      email,
      passwordHash,
      role: 'OWNER'
    });

    // ৪. বিজনেসে ownerId আপডেট
    business.ownerId = user._id;
    await business.save();

    // ৫. টোকেন তৈরি ও কুকিতে পাঠানো
    const token = generateToken(user._id.toString(), business._id.toString(), user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // ৭ দিন
    });

    res.status(201).json({
      success: true,
      message: 'Business & Owner account created successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        business: { id: business._id, name: business.name, slug: business.slug }
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user._id.toString(), user.businessId.toString(), user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};