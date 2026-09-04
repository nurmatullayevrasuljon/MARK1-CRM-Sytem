const mongoose = require("mongoose");
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

    // BUG FIX: aggregate() Mongoose'ning avtomatik tur o'girishidan
    // (string -> ObjectId) foydalanmaydi. req.user.store_id JWT'dan matn
    // sifatida keladi, bazada esa ObjectId sifatida saqlangan — shu sabab
    // $match hech qachon mos kelmasdi va bu funksiya har doim bo'sh massiv
    // qaytarardi, garchi mijozlar create/update/delete orqali to'g'ri
    // saqlangan bo'lsa ham (ular oddiy findOne/findOneAndUpdate ishlatadi,
    // ular avtomatik tur o'giradi).
    const filter = {
      store_id: new mongoose.Types.ObjectId(store_id),
    };

    if (client_id) {
      filter._id = new mongoose.Types.ObjectId(client_id);
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

    const clients = await Client.aggregate([
      {
        $match: filter,
      },

      {
        $lookup: {
          from: "sales",
          let: {
            clientId: "$_id",
            storeId: "$store_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$client_id", "$$clientId"],
                    },
                    {
                      $eq: ["$store_id", "$$storeId"],
                    },
                    {
                      // BUG FIX: Sale modelida bu maydon "total_remaining"
                      // deb ataladi ("remaining_amount" emas). Noto'g'ri nom
                      // bilan bu shart hech qachon rost bo'lmasdi, shuning
                      // uchun mijozning total_debt'i har doim 0 chiqardi.
                      $gt: ["$total_remaining", 0],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total_debt: {
                  $sum: "$total_remaining",
                },
              },
            },
          ],
          as: "debt",
        },
      },

      {
        $addFields: {
          total_debt: {
            $ifNull: [
              {
                $arrayElemAt: ["$debt.total_debt", 0],
              },
              0,
            ],
          },
        },
      },

      {
        $project: {
          debt: 0,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json(clients);
  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      message: err.message,
    });
  }
};