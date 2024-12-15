const razorpay = require('../utils/razorpayInstance');
const crypto = require('crypto');
const Payment = require('../models/payment_model'); // Payment model
const Student = require('../models/student_model'); // Student model
const { ErrorHandler } = require('../middlewares/error'); // Import ErrorHandler

const paymentCtrl = {
  /**
   * Create Razorpay Order and Save Payment Record
   */
  createOrder: async (req, res, next) => {
    const { studentId, installment, amount, session } = req.body;

    try {
      // Check if the student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return next(new ErrorHandler(404, 'Student not found'));
      }

      // Check if this installment already exists
      const existingPayment = await Payment.findOne({
        studentId,
        installment,
        session,
      });
      if (existingPayment && existingPayment.status === 'paid') {
        return next(new ErrorHandler(400, 'Installment already paid.'));
      }

      // Create a Razorpay order
      const order = await razorpay.orders.create({
        amount: amount * 100, // Amount in smallest currency unit
        currency: 'INR',
        receipt: `${studentId}-${installment}`, // Unique receipt
        payment_capture: 1,
      });

      // Create a payment record
      const payment = await Payment.create({
        studentId,
        installment,
        amount,
        session,
        status: 'created',
        orderId: order.id, // Store Razorpay Order ID
      });

      // Link payment to the student
      await Student.findByIdAndUpdate(studentId, {
        $push: { payments: payment._id },
      });

      res.status(200).json(order); // Send the Razorpay order to the client
    } catch (error) {
      next(error); // Pass unexpected errors to the middleware
    }
  },

  /**
   * Verify Razorpay Payment and Update Payment Record
   */
  verifyPayment: async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
      // Verify Razorpay signature
      const hmac = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (hmac !== razorpay_signature) {
        return next(new ErrorHandler(400, 'Payment verification failed'));
      }

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: 'paid',
          paidAt: new Date(),
        },
        { new: true } // Return updated document
      );

      if (!payment) {
        return next(new ErrorHandler(404, 'Payment record not found'));
      }

      res.status(200).json({ status: 'Payment verified successfully', payment });
    } catch (error) {
      next(error); // Pass unexpected errors to the middleware
    }
  },
};

module.exports = paymentCtrl;
