const Product = require("../models/product");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.getAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await Product.updateActive(id, isActive);
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};