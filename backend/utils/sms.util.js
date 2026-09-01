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
    // BUG FIX: error.message Axios'ning umumiy xabari edi ("Request failed
    // with status code 400/401"), DevSMS'ning aniq sababi emas. Haqiqiy sabab
    // error.response.data ichida keladi — endi shuni birinchi navbatda olamiz.
    const apiMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    console.error(`Failed to send SMS to ${phone}:`, apiMessage);
    if (error.response) {
      console.error("DevSMS response status:", error.response.status);
      console.error("DevSMS response data:", error.response.data);
    }

    return { success: false, error: apiMessage };
  }
}

module.exports = sendSms;