import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { Booking } from '../models/Booking.js';
import { Invoice } from '../models/Invoice.js';
import mongoose from 'mongoose';

export const getDashboardMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      res.status(401).json({ success: false, message: 'Unauthorized business access' });
      return;
    }

    const bId = new mongoose.Types.ObjectId(businessId);

    // ১. মোট রেভিনিউ ক্যালকুলেশন (Aggregated from PAID invoices)
    const revenueStats = await Invoice.aggregate([
      { $match: { businessId: bId, status: 'PAID' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);

    // ২. পেন্ডিং পেমেন্ট ক্যালকুলেশন
    const unpaidStats = await Invoice.aggregate([
      { $match: { businessId: bId, status: 'UNPAID' } },
      { $group: { _id: null, pendingAmount: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    // ৩. মোট বুকিং সংখ্যা ও কনফার্মড বুকিং
    const totalBookings = await Booking.countDocuments({ businessId: bId });
    const completedBookings = await Booking.countDocuments({ businessId: bId, status: 'COMPLETED' });

    // ৪. রিসেন্ট ৫টি বুকিং
    const recentBookings = await Booking.find({ businessId: bId })
      .populate('serviceId', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          pendingAmount: unpaidStats[0]?.pendingAmount || 0,
          pendingInvoicesCount: unpaidStats[0]?.count || 0,
          totalBookings,
          completedBookings
        },
        recentBookings
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};