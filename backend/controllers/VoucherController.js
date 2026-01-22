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

  createOrUpdate: async (req, res) => {
    try {
      const {
        VoucherName,
        DiscountType,
        Discount,
        Quantity,
        ConditionText,
        EndTime,
        CreatedBy,
      } = req.body;

      // 🔍 check voucher trùng tên
      const existing = await Voucher.getByNameAndSeller(
        VoucherName,
        CreatedBy
      );

      if (existing) {
        // ⛔ validate endtime
        if (new Date(EndTime) <= new Date(existing.EndTime)) {
          return res.status(400).json({
            message: "Ngày hết hạn mới phải lớn hơn ngày cũ",
          });
        }

        await Voucher.update(existing.VoucherId, Quantity, EndTime);

        return res.json({
          message: "Cập nhật voucher thành công",
          VoucherId: existing.VoucherId,
        });
      }

      // ✅ create mới
      const id = await Voucher.create({
        VoucherName,
        DiscountType,
        Discount,
        Quantity,
        ConditionText,
        EndTime,
        CreatedBy,
      });

      res.status(201).json({
        message: "Tạo voucher thành công",
        VoucherId: id,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  getById: async (req, res) => {
    const voucher = await Voucher.getById(req.params.id);
    res.json(voucher);
  },
  
};

module.exports = VoucherController;
