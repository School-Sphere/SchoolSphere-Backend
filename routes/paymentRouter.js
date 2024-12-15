const express = require('express');
const paymentCtrl = require('../controllers/payment_controller');
const paymentRouter = express.Router();

// Routes for payment
paymentRouter.post('/create-order', paymentCtrl.createOrder);
paymentRouter.post('/verify-payment', paymentCtrl.verifyPayment);

module.exports = paymentRouter;
