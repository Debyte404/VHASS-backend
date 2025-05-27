import mongoose from "mongoose";

const schema = new mongoose.Schema({
  // Placeholder for PhonePe payment details
  phonepe_payment_id: {
    type: String,
    required: false,
  },
  phonepe_order_id: {
    type: String,
    required: false,
  },
  phonepe_signature: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Payment = mongoose.model("Payment", schema);
