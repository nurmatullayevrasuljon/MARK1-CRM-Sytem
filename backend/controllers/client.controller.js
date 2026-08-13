const Client = require("../models/client.model");

exports.createClient = async (req, res) => {
  try {
    const { client_name, client_phone } = req.body;
    const { store_id } = req.user;

    let existingClientName;
    let existingClientPhone;

    existingClientName = await Client.findOne({
      client_name,
      store_id,
    });

    if (client_phone) {
      existingClientPhone = await Client.findOne({
        client_phone,
        store_id,
      });
    }

    if (existingClientName) {
      return res.status(400).json({
        message: `${existingClientName.client_name} ushbu ism bilan xaridor allaqachon mavjud, boshqa ism kiriting`,
      });
    }

    if (existingClientPhone) {
      return res.status(400).json({
        message: `${existingClientPhone.client_phone} ushbu telefon raqam bilan xaridor allaqachon mavjud, boshqa telefon raqam kiriting`,
      });
    }

    const client = await Client.create({
      store_id,
      client_name,
      client_phone,
    });

    return res
      .status(200)
      .json({ message: "Xaridor muvaffaqiyatli qo'shildi", client });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { client_id } = req.query;
    const { client_name, client_phone } = req.body;
    const { store_id } = req.user;

    const client = await Client.findOne({
      _id: client_id,
      store_id,
    });

    if (!client) {
      return res.status(400).json({
        message: "Xaridor topilmadi",
      });
    }

    const existingClientName = await Client.findOne({
      client_name,
      store_id,
      _id: { $ne: client_id },
    });

    if (existingClientName) {
      return res.status(400).json({
        message: `${existingClientName.client_name} ushbu ism bilan xaridor allaqachon mavjud, boshqa ism kiriting`,
      });
    }

    let existingClientPhone = null;

    if (client_phone) {
      existingClientPhone = await Client.findOne({
        client_phone,
        store_id,
        _id: { $ne: client_id },
      });

      if (existingClientPhone) {
        return res.status(400).json({
          message: `${existingClientPhone.client_phone} ushbu telefon raqam bilan xaridor allaqachon mavjud, boshqa telefon raqam kiriting`,
        });
      }
    }

    client.client_name = client_name;
    client.client_phone = client_phone;

    await client.save();

    return res.status(200).json({
      message: "Xaridor muvaffaqiyatli yangilandi",
      client,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({
      message: err.message,
    });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { client_id } = req.query;
    const { store_id } = req.user;

    const client = await Client.findOneAndDelete({
      _id: client_id,
      store_id,
    });

    if (!client) {
      return res.status(400).json({
        message: "Xaridor topilmadi",
      });
    }

    return res.status(200).json({
      message: "Xaridor muvaffaqiyatli o'chirildi",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({
      message: err.message,
    });
  }
};

exports.getClients = async (req, res) => {
  try {
    const { store_id } = req.user;
    const { client_id, client_name, client_phone } = req.query;

    const filter = {
      store_id,
    };

    if (client_id) {
      filter._id = client_id;
    }

    if (client_name) {
      filter.client_name = {
        $regex: client_name,
        $options: "i",
      };
    }

    if (client_phone) {
      filter.client_phone = client_phone;
    }

    const clients = await Client.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json(clients);
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};
