const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student', // Reference to the Student model
    required: true,
  },
  installment: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'], // Payment status
    default: 'created',
  },
  orderId: {
    type: String,
    unique: true,
    sparse: true, // Razorpay Order ID (optional until generated)
  },
  paymentId: {
    type: String, // Razorpay Payment ID
  },
  signature: {
    type: String, // Razorpay Signature for payment verification
  },
  session: {
    type: String, // Academic session (e.g., "2024-2025")
    required: true,
  },
  paidAt: {
    type: Date, // Timestamp of successful payment
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp of order creation
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
