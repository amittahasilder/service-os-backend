import { Request, Response } from 'express';
import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Booking } from '../models/Booking.js';
import { z } from 'zod';

const publicBookingSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(6, 'Valid phone number is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  notes: z.string().optional()
});

export const getPublicBusinessData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const business = await Business.findOne({ slug }).select('name slug currency');
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    const services = await Service.find({ businessId: business._id, isActive: true })
      .select('name description durationMinutes price');

    res.status(200).json({
      success: true,
      data: { business, services }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      res.status(400).json({ success: false, message: 'serviceId and date are required' });
      return;
    }

    const business = await Business.findOne({ slug });
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    const service = await Service.findOne({ _id: serviceId, businessId: business._id, isActive: true });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const selectedDate = new Date(date as string);
    const dayStart = new Date(selectedDate.setHours(9, 0, 0, 0));
    const dayEnd = new Date(selectedDate.setHours(17, 0, 0, 0));

    const existingBookings = await Booking.find({
      businessId: business._id,
      status: { $nin: ['CANCELLED'] },
      startTime: { $gte: new Date(new Date(date as string).setHours(0, 0, 0, 0)) },
      endTime: { $lte: new Date(new Date(date as string).setHours(23, 59, 59, 999)) }
    }).select('startTime endTime');

    const availableSlots: string[] = [];
    const stepMs = service.durationMinutes * 60 * 1000;
    let currentSlot = new Date(dayStart);

    while (currentSlot.getTime() + stepMs <= dayEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + stepMs);

      const hasConflict = existingBookings.some((booking) => {
        const bookedStart = new Date(booking.startTime).getTime();
        const bookedEnd = new Date(booking.endTime).getTime();
        return currentSlot.getTime() < bookedEnd && slotEnd.getTime() > bookedStart;
      });

      if (!hasConflict) {
        availableSlots.push(currentSlot.toISOString());
      }

      currentSlot = new Date(currentSlot.getTime() + stepMs);
    }

    res.status(200).json({
      success: true,
      data: {
        date,
        durationMinutes: service.durationMinutes,
        slots: availableSlots
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPublicBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const business = await Business.findOne({ slug });
    if (!business) {
      res.status(404).json({ success: false, message: 'Business not found' });
      return;
    }

    const parsed = publicBookingSchema.parse(req.body);
    const service = await Service.findOne({ _id: parsed.serviceId, businessId: business._id, isActive: true });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const start = new Date(parsed.startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    const conflict = await Booking.findOne({
      businessId: business._id,
      status: { $nin: ['CANCELLED'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (conflict) {
      res.status(409).json({ success: false, message: 'Slot already booked' });
      return;
    }

    const booking = await Booking.create({
      businessId: business._id,
      serviceId: service._id,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone,
      startTime: start,
      endTime: end,
      totalPrice: service.price,
      notes: parsed.notes,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID'
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed',
      data: booking
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};