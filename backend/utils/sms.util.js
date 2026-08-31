const axios = require("axios");

const DEVSMS_API_URL = "https://devsms.uz/api/send_sms.php";

async function sendSms(
  phone,
  message,
  type = "eskiz",
  template_type,
  service_name,
  otp_code,
) {
  try {
    const formalPhone = `998${phone}`;

    const response = await axios.post(
      DEVSMS_API_URL,
      {
        phone: formalPhone,
        message,
        type,
        template_type,
        service_name,
        otp_code,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEVSMS_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    return { success: response.data.success };
  } catch (error) {
    console.error(`Failed to send SMS to ${phone}:`, error.message);
    console.log(error);

    return { success: false, error: error.message };
  }
}

module.exports = sendSms;
