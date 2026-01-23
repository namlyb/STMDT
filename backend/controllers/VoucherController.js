const Voucher = require("../models/Voucher");

const VoucherController = {
  create: async (req, res) => {
    try {
      const voucherId = await Voucher.create(req.body);
      res.status(201).json({ message: "Tạo voucher thành công", VoucherId: voucherId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server khi tạo voucher" });
    }
  },

  getBySeller: async (req, res) => {
    try {
      const sellerId = req.params.sellerId;
      const vouchers = await Voucher.getBySeller(sellerId);
      res.status(200).json(vouchers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  update: async (req, res) => {
  try {
    const { id } = req.params;
    const { Quantity, EndTime } = req.body;

    const affected = await Voucher.update(id, Quantity, EndTime);

    if (affected === 0) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.json({ message: "Cập nhật voucher thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi cập nhật voucher" });
  }
},


  getById: async (req, res) => {
    const voucher = await Voucher.getById(req.params.id);
    res.json(voucher);
  },
  
  getByAdmin: async (req, res) => {
  try {
    const vouchers = await Voucher.getByAdmin();
    res.status(200).json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
},

getRandom: async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const accountId = req.user?.AccountId || null;

    const vouchers = await Voucher.getRandom(limit, accountId);
    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
},


};

module.exports = VoucherController;
