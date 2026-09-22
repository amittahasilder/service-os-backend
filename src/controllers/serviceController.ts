import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { Service } from '../models/Service.js';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  durationMinutes: z.number().min(5, "Duration must be at least 5 minutes"),
  price: z.number().min(0, "Price must be 0 or positive")
});

// ১. নতুন সার্ভিস তৈরি (শুধুমাত্র ওনার বা অনুমোদিত স্টাফ)
export const createService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      res.status(401).json({ success: false, message: 'Unauthorized business access' });
      return;
    }

    const validatedData = serviceSchema.parse(req.body);

    const service = await Service.create({
      businessId,
      ...validatedData
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};

// ২. বিজনেসের সব সার্ভিস লিস্ট আনা (মাল্টি-টেন্যান্ট আইসোলেশন)
export const getServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const services = await Service.find({ businessId, isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. সার্ভিস আপডেট করা
export const updateService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    const updatedService = await Service.findOneAndUpdate(
      { _id: id, businessId },
      req.body,
      { new: true }
    );

    if (!updatedService) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ৪. সার্ভিস ডিলিট / ডিঅ্যাক্টিভেট করা
export const deleteService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    const service = await Service.findOneAndUpdate(
      { _id: id, businessId },
      { isActive: false },
      { new: true }
    );

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Service removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};