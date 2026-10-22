const File = require("../models/file.model");

exports.createFile = async (req, res) => {
  try {
    const { filename, mimetype, size } = req.file;
    const { id } = req.user;
    const fileUrl = `${req.protocol}://${req.get("host")}/api/uploads/${filename}`;
    const newFile = await File.create({
      store_id: id,
      file_name: filename,
      file_url: fileUrl,
      mimetype,
      size,
    });
    res
      .status(200)
      .json({ message: "Fayl muvaffaqiyatli saqlandi", file: newFile });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message:err.message });
  }
};
