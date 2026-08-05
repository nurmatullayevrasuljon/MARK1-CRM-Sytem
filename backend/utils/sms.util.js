async function sendSms(phone, otp) {
  try {
    // TODO: replace with your actual SMS provider call
    // e.g. await smsClient.messages.create({ to: phone, body: `Your OTP is ${otp}` });

    console.log(`SMS sent to ${phone}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send SMS to ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = sendSms;
