import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: "rzp_live_SNOB4m6gvMQBbX",
  key_secret: "tuMCl0p4dCLIcGhU36zsaKhF",
});

export async function POST(request: Request) {
  try {
    const { amount, currency } = await request.json();

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Error creating order" },
      { status: 500 }
    );
  }
}
