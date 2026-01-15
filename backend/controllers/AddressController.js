const Address = require("../models/Address");

const AddressController = {
  getAll: async (req, res) => {
    try {
      const list = await Address.getAll();
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getByAccount: async (req, res) => {
    try {
      const { accountId } = req.params;
      const list = await Address.getByAccountId(accountId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getMyAddress: async (req, res) => {
    try {
      const list = await Address.getByAccountId(req.user.AccountId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { Content } = req.body;
      if (!Content)
        return res.status(400).json({ message: "Thiếu nội dung" });

      const address = await Address.create({
        AccountId: req.user.AccountId,
        Content,
      });

      res.status(201).json(address);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { Content } = req.body;

      const address = await Address.getById(id);
      if (!address)
        return res.status(404).json({ message: "Không tồn tại" });

      if (address.AccountId !== req.user.AccountId)
        return res.status(403).json({ message: "Không có quyền" });

      await Address.update(id, Content);
      res.json({ message: "Cập nhật thành công" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const address = await Address.getById(id);
      if (!address)
        return res.status(404).json({ message: "Không tồn tại" });

      if (address.AccountId !== req.user.AccountId)
        return res.status(403).json({ message: "Không có quyền" });

      await Address.delete(id);
      res.json({ message: "Xóa thành công" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = AddressController;
