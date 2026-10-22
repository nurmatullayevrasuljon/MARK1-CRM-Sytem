const mongoose = require("mongoose");
exports.db = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 50,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Mongodb connected");
  } catch (e) {
    console.error(`Mongodb error: ${e.message}`);
    process.exit(1);
  }
};
