import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { Booking } from '../models/Booking.js';
import { Service } from '../models/Service.js';
import { z } from 'zod';

const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  staffId: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(6, "Valid phone number is required"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid ISO date format"),
  notes: z.string().optional()
});

// ১. নতুন বুকিং তৈরি (ডাবল-বুকিং চেক সহ)
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      res.status(401).json({ success: false, message: 'Unauthorized business context' });
      return;
    }

    const parsedData = createBookingSchema.parse(req.body);
    const service = await Service.findOne({ _id: parsedData.serviceId, businessId, isActive: true });

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found or inactive' });
      return;
    }

    const start = new Date(parsedData.startTime);
    // সার্ভিসের ডিউরেশন অনুযায়ী endTime ক্যালকুলেশন
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    // ডাবল-বুকিং প্রিভেনশন অ্যালগরিদম
    // লজিক: (start < existingEnd) AND (end > existingStart)
    const conflictQuery: any = {
      businessId,
      status: { $nin: ['CANCELLED'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    };

    if (parsedData.staffId) {
      conflictQuery.staffId = parsedData.staffId;
    }

    const existingConflict = await Booking.findOne(conflictQuery);

    if (existingConflict) {
      res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose another time.'
      });
      return;
    }

    const booking = await Booking.create({
      businessId,
      serviceId: service._id,
      staffId: parsedData.staffId,
      customerName: parsedData.customerName,
      customerEmail: parsedData.customerEmail,
      customerPhone: parsedData.customerPhone,
      startTime: start,
      endTime: end,
      totalPrice: service.price,
      notes: parsedData.notes
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};

// ২. বিজনেসের সব বুকিং দেখা (ক্যালেন্ডার ও টেবিল ভিউয়ের জন্য)
export const getBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { status, date } = req.query;

    const filter: any = { businessId };

    if (status) {
      filter.status = status;
    }

    // নির্দিষ্ট কোনো দিনের বুকিং ফিল্টার
    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await Booking.find(filter)
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'name email')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. বুকিং স্ট্যাটাস আপডেট (CONFIRMED -> COMPLETED / CANCELLED)
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const booking = await Booking.findOneAndUpdate(
      { _id: id, businessId },
      { ...(status && { status }), ...(paymentStatus && { paymentStatus }) },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};