const Order = require("../models/Order");
const ShipType = require("../models/ShipType");
const VoucherUsage = require("../models/VoucherUsage");
const OrderDetail = require("../models/OrderDetail");
const { pool } = require("../config/db"); // THÊM DÒNG NÀY

const OrderController = {
  checkout: async (req, res) => {
    try {
      const { cartIds } = req.body;
      const accountId = req.user.AccountId;

      // 1️⃣ Lấy sản phẩm checkout
      const items = await Order.getCheckoutItems(accountId, cartIds);

      // 2️⃣ Lấy voucher toàn đơn (chỉ admin, tất cả loại)
      const orderVouchers = await Order.getOrderVouchers(accountId);

      // 3️⃣ Lấy tất cả voucher để kiểm tra trùng
      const allVouchers = await Order.getAllVouchers(accountId);

      // 4️⃣ Format image URL
      const itemsWithImages = items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      res.json({ 
        items: itemsWithImages,
        orderVouchers,
        allVouchers // Gửi thêm để client có thể kiểm tra trùng
      });

    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  checkoutBuyNow: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { productId, quantity } = req.body;

      // 1️⃣ Lấy sản phẩm
      const items = await Order.checkoutBuyNow(accountId, productId, quantity);

      if (!items.length) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      // 2️⃣ Lấy voucher toàn đơn
      const orderVouchers = await Order.getOrderVouchers(accountId);

      // 3️⃣ Format image URL
      const itemsWithImages = items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      return res.json({ 
        items: itemsWithImages,
        orderVouchers 
      });

    } catch (err) {
      console.error("checkoutBuyNow:", err);
      return res.status(500).json({ message: "Checkout buy now failed" });
    }
  },

  // API để lấy danh sách ship type
  getShipTypes: async (req, res) => {
    try {
      const shipTypes = await ShipType.getAll();
      res.json(shipTypes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  createOrder: async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const accountId = req.user.AccountId;
      const {
        addressId,
        items,
        orderVoucherId,
        paymentMethodId,
        cartIds = [],
        isBuyNow = false
      } = req.body;

      console.log("Order data received:", req.body);

      // 1. Validate dữ liệu
      if (!addressId || !items || !paymentMethodId || items.length === 0) {
        throw new Error("Thiếu thông tin cần thiết để tạo đơn hàng");
      }

      // 2. Validate địa chỉ
      const [addressRows] = await connection.query(
        "SELECT * FROM Address WHERE AddressId = ? AND AccountId = ? AND Status = 1",
        [addressId, accountId]
      );
      if (!addressRows.length) {
        throw new Error("Địa chỉ không hợp lệ");
      }

      // 3. Validate payment method
      const [paymentRows] = await connection.query(
        "SELECT * FROM PaymentMethods WHERE MethodId = ? AND Status = 1",
        [paymentMethodId]
      );
      if (!paymentRows.length) {
        throw new Error("Phương thức thanh toán không hợp lệ");
      }

      // 4. Validate và tính toán tổng giá trị đơn hàng
      let grandTotal = 0;
      const orderDetailsData = [];
      const usedVoucherIds = new Set();

      // Validate voucher toàn đơn nếu có
      if (orderVoucherId) {
        const orderVoucher = await VoucherUsage.validateVoucher(orderVoucherId, accountId);
        if (!orderVoucher) {
          throw new Error("Voucher toàn đơn không hợp lệ");
        }
        usedVoucherIds.add(orderVoucherId);
      }

      for (const item of items) {
        console.log("Processing item:", item);
        
        // Validate sản phẩm
        const product = await Order.getProductDetails(item.productId);
        if (!product) {
          throw new Error(`Sản phẩm ${item.productId} không khả dụng`);
        }

        // Validate số lượng
        if (!item.quantity || item.quantity < 1) {
          throw new Error(`Số lượng sản phẩm ${item.productId} không hợp lệ`);
        }

        // Validate shipping type
        const [shipTypeRows] = await connection.query(
          "SELECT * FROM ShipType WHERE ShipTypeId = ?",
          [item.selectedShipTypeId]
        );
        if (!shipTypeRows.length) {
          throw new Error(`Phương thức vận chuyển không hợp lệ cho sản phẩm ${item.productId}`);
        }

        // Validate voucher sản phẩm nếu có
        let itemVoucher = null;
        if (item.selectedVoucherId) {
          if (usedVoucherIds.has(item.selectedVoucherId)) {
            throw new Error(`Voucher ${item.selectedVoucherId} đã được sử dụng`);
          }
          
          itemVoucher = await VoucherUsage.validateVoucher(item.selectedVoucherId, accountId);
          if (!itemVoucher) {
            throw new Error(`Voucher sản phẩm ${item.selectedVoucherId} không hợp lệ`);
          }
          usedVoucherIds.add(item.selectedVoucherId);
        }

        // Tính toán giá trị
        const unitPrice = product.Price;
        const itemTotal = unitPrice * item.quantity;
        const shipFee = shipTypeRows[0].ShipFee;

        // Tính discount cho sản phẩm nếu có voucher
        let itemDiscount = 0;
        if (itemVoucher) {
          if (itemTotal >= itemVoucher.MinOrderValue) {
            if (itemVoucher.DiscountType === 'percent') {
              itemDiscount = Math.floor(itemTotal * itemVoucher.DiscountValue / 100);
              if (itemVoucher.MaxDiscount) {
                itemDiscount = Math.min(itemDiscount, itemVoucher.MaxDiscount);
              }
            } else if (itemVoucher.DiscountType === 'fixed') {
              itemDiscount = itemVoucher.DiscountValue;
            }
            itemDiscount = Math.min(itemDiscount, itemTotal);
          }
        }

        // Lấy platform fee
        const feeId = await Order.getApplicableFee(unitPrice);

        // Tính final price cho item
        const itemFinalPrice = itemTotal - itemDiscount + shipFee;
        grandTotal += itemFinalPrice;

        // Lưu thông tin cho OrderDetails
        orderDetailsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          itemTotal: itemTotal,
          itemDiscount: itemDiscount,
          shipTypeId: item.selectedShipTypeId,
          shipFee: shipFee,
          feeId: feeId,
          voucherId: item.selectedVoucherId,
          itemFinalPrice: itemFinalPrice
        });
      }

      // 5. Tính discount cho voucher toàn đơn nếu có
      let orderVoucherDiscount = 0;
      let orderVoucher = null;
      
      if (orderVoucherId) {
        orderVoucher = await VoucherUsage.validateVoucher(orderVoucherId, accountId);
        
        // Tính tổng giá trị sản phẩm sau khi đã áp dụng voucher sản phẩm
        const productTotalAfterItemDiscount = orderDetailsData.reduce(
          (sum, item) => sum + (item.itemTotal - item.itemDiscount), 0
        );

        if (productTotalAfterItemDiscount >= orderVoucher.MinOrderValue) {
          if (orderVoucher.DiscountType === 'ship') {
            // Tính tổng phí ship
            const totalShip = orderDetailsData.reduce((sum, item) => sum + item.shipFee, 0);
            orderVoucherDiscount = Math.min(totalShip, orderVoucher.DiscountValue);
            grandTotal -= orderVoucherDiscount;
          } else if (orderVoucher.DiscountType === 'percent') {
            orderVoucherDiscount = Math.floor(productTotalAfterItemDiscount * orderVoucher.DiscountValue / 100);
            if (orderVoucher.MaxDiscount) {
              orderVoucherDiscount = Math.min(orderVoucherDiscount, orderVoucher.MaxDiscount);
            }
            grandTotal -= orderVoucherDiscount;
          } else if (orderVoucher.DiscountType === 'fixed') {
            orderVoucherDiscount = orderVoucher.DiscountValue;
            grandTotal -= orderVoucherDiscount;
          }
        }
      }

      // Đảm bảo grandTotal không âm
      grandTotal = Math.max(grandTotal, 0);

      // 6. Tạo đơn hàng chính
      const orderDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const orderId = await Order.createOrder({
        AccountId: accountId,
        AddressId: addressId,
        MethodId: paymentMethodId,
        UsageId: orderVoucherId || null,
        FinalPrice: grandTotal,
        OrderDate: orderDate
      });

      // 7. Tạo các chi tiết đơn hàng
      for (const itemData of orderDetailsData) {
        await OrderDetail.create({
          OrderId: orderId,
          ProductId: itemData.productId,
          UsageId: itemData.voucherId || null,
          UnitPrice: itemData.unitPrice,
          Quantity: itemData.quantity,
          ShipTypeId: itemData.shipTypeId,
          ShipFee: itemData.shipFee,
          FeeId: itemData.feeId
        });

        // Đánh dấu voucher sản phẩm đã sử dụng
        if (itemData.voucherId) {
          await VoucherUsage.markAsUsed(itemData.voucherId);
        }
      }

      // 8. Đánh dấu voucher toàn đơn đã sử dụng
      if (orderVoucherId) {
        await VoucherUsage.markAsUsed(orderVoucherId);
      }

      // 9. Xóa cart items nếu là mua từ giỏ hàng
      if (!isBuyNow && cartIds.length > 0) {
        await connection.query(
          "UPDATE Carts SET Status = 0 WHERE CartId IN (?)",
          [cartIds]
        );
      }

      await connection.commit();

      res.json({ 
        message: "Đặt hàng thành công", 
        orderId: orderId,
        grandTotal: grandTotal
      });

    } catch (error) {
      await connection.rollback();
      console.error("Create order error:", error);
      res.status(500).json({ 
        message: error.message || "Đặt hàng thất bại. Vui lòng thử lại." 
      });
    } finally {
      connection.release();
    }
  },

  getMyOrders: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      
      const [orders] = await pool.query(
        `SELECT o.*, a.Content as AddressContent, pm.MethodName
         FROM Orders o
         LEFT JOIN Address a ON o.AddressId = a.AddressId
         LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
         WHERE o.AccountId = ?
         ORDER BY o.OrderId DESC`,
        [accountId]
      );

      res.json(orders);
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  // Lấy chi tiết đơn hàng
  getOrderDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;

      // Lấy thông tin đơn hàng chính
      const [orderRows] = await pool.query(
        `SELECT o.*, a.*, pm.MethodName
         FROM Orders o
         LEFT JOIN Address a ON o.AddressId = a.AddressId
         LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
         WHERE o.OrderId = ? AND o.AccountId = ?`,
        [orderId, accountId]
      );

      if (!orderRows.length) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Lấy chi tiết đơn hàng
      const [detailRows] = await pool.query(
        `SELECT od.*, p.ProductName, p.Image, st.Content as ShipTypeContent, pf.PercentValue as PlatformFeePercent
         FROM OrderDetails od
         LEFT JOIN Products p ON od.ProductId = p.ProductId
         LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
         LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
         WHERE od.OrderId = ?`,
        [orderId]
      );

      // Format image URL
      const detailsWithImages = detailRows.map(detail => ({
        ...detail,
        Image: detail.Image 
          ? `${req.protocol}://${req.get("host")}/uploads/ProductImage/${detail.Image}`
          : null
      }));

      res.json({
        order: orderRows[0],
        details: detailsWithImages
      });

    } catch (error) {
      console.error("Get order detail error:", error);
      res.status(500).json({ message: "Lỗi khi lấy chi tiết đơn hàng" });
    }
  }
};

module.exports = OrderController;