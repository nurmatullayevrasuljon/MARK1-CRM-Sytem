const mongoose = require("mongoose");
exports.db = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongodb connected");
  } catch (e) {
    console.error(`Mongodb error: ${e.message}`);
    process.exit(1);
  }
};
