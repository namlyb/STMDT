const Account = require("../models/account");

exports.getUsers = async (req, res) => {
  try {
    const users = await Account.getAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await Account.updateActive(id, isActive);
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};