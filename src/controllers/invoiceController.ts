import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { Invoice } from '../models/Invoice.js';
import { Booking } from '../models/Booking.js';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  bookingId: z.string().optional(),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0)
  })).min(1, "At least one item is required"),
  tax: z.number().default(0),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format")
});

const generateInvoiceNumber = async (businessId: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await Invoice.countDocuments({ businessId });
  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${currentYear}-${sequence}`;
};

// 1. Invoice toiri kora
export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      res.status(401).json({ success: false, message: 'Unauthorized business context' });
      return;
    }

    const parsed = createInvoiceSchema.parse(req.body);

    const items = parsed.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + parsed.tax;
    const invoiceNumber = await generateInvoiceNumber(businessId);

    const invoice = await Invoice.create({
      businessId,
      bookingId: parsed.bookingId,
      invoiceNumber,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      items,
      subtotal,
      tax: parsed.tax,
      total,
      dueDate: new Date(parsed.dueDate),
      status: 'UNPAID'
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.errors?.[0]?.message || error.message });
  }
};

// 2. Booking theke direct auto-invoice toiri
export const createInvoiceFromBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { bookingId } = req.params;

    const booking: any = await Booking.findOne({ _id: bookingId, businessId }).populate('serviceId');
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const existing = await Invoice.findOne({ bookingId, businessId });
    if (existing) {
      res.status(400).json({ success: false, message: 'Invoice already exists for this booking', data: existing });
      return;
    }

    const invoiceNumber = await generateInvoiceNumber(businessId as string);
    const items = [{
      description: booking.serviceId?.name || 'Service Appointment',
      quantity: 1,
      unitPrice: booking.totalPrice,
      total: booking.totalPrice
    }];

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await Invoice.create({
      businessId,
      bookingId: booking._id,
      invoiceNumber,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      items,
      subtotal: booking.totalPrice,
      tax: 0,
      total: booking.totalPrice,
      dueDate,
      status: booking.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID',
      paidAt: booking.paymentStatus === 'PAID' ? new Date() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated from booking successfully',
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Shob invoice list fetch kora
export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const invoices = await Invoice.find({ businessId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Invoice payment status update (UNPAID -> PAID)
export const markInvoiceAsPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, businessId },
      { status: 'PAID', paidAt: new Date() },
      { new: true }
    );

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.bookingId) {
      await Booking.findByIdAndUpdate(invoice.bookingId, { paymentStatus: 'PAID' });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice marked as PAID',
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};