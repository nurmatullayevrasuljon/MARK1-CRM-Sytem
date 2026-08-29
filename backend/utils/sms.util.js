const axios = require("axios");

const DEVSMS_API_URL = "https://devsms.uz/api/send_sms.php";

async function sendSms(phone, message) {
  try {
    const formalPhone = `998${phone}`;
    console.log(formalPhone);
    console.log(message);
    console.log(typeof formalPhone);
    console.log(typeof message);
    

    const response = await axios.post(
      DEVSMS_API_URL,
      {
        phone: formalPhone,
        message,
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
    return { success: false, error: error.message };
  }
}

module.exports = sendSms;
