const Order = require("../models/Order");
const ShipType = require("../models/ShipType");
const VoucherUsage = require("../models/VoucherUsage");
const OrderDetail = require("../models/OrderDetail");
const { pool } = require("../config/db");

const OrderController = {
  checkout: async (req, res) => {
    try {
      const { cartIds } = req.body;
      const accountId = req.user.AccountId;

      const checkoutData = await Order.getCheckoutData(accountId, cartIds);

      // Format image URL
      const itemsWithImages = checkoutData.items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      res.json({ 
        items: itemsWithImages,
        orderVouchers: checkoutData.orderVouchers
      });

    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // Checkout buy now
  checkoutBuyNow: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { productId, quantity } = req.body;

      const checkoutData = await Order.getBuyNowData(accountId, productId, quantity);

      if (!checkoutData.items.length) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      // Format image URL
      const itemsWithImages = checkoutData.items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      return res.json({ 
        items: itemsWithImages,
        orderVouchers: checkoutData.orderVouchers
      });

    } catch (err) {
      console.error("checkoutBuyNow:", err);
      return res.status(500).json({ message: "Checkout buy now failed" });
    }
  },

  // Lấy danh sách ship type
  getShipTypes: async (req, res) => {
    try {
      const shipTypes = await ShipType.getAll();
      res.json(shipTypes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // Tạo đơn hàng - chính logic
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

      // 1. Validate dữ liệu cơ bản
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

      // 4. Validate voucher toàn đơn nếu có
      let orderVoucher = null;
      let orderTotal = 0;
      
      // Tính tổng giá trị đơn hàng trước khi giảm
      for (const item of items) {
        const product = await Order.getProductDetails(item.productId);
        if (!product) {
          throw new Error(`Sản phẩm ${item.productId} không khả dụng`);
        }
        orderTotal += product.Price * item.quantity;
      }

      if (orderVoucherId) {
        orderVoucher = await VoucherUsage.validateVoucher(orderVoucherId, accountId);
        if (!orderVoucher) {
          throw new Error("Voucher toàn đơn không hợp lệ");
        }

        // Kiểm tra điều kiện giá trị tối thiểu
        if (orderTotal < orderVoucher.MinOrderValue) {
          throw new Error(`Voucher toàn đơn yêu cầu đơn hàng tối thiểu ${orderVoucher.MinOrderValue}đ`);
        }
      }

      // 5. Tính toán và validate
      let grandTotal = 0;
      const orderItemsData = [];
      const productVoucherUsage = new Map(); // Theo dõi voucher sản phẩm đã dùng

      for (const item of items) {
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
          itemVoucher = await VoucherUsage.validateVoucherForProduct(item.selectedVoucherId, accountId, product.StallId);
          if (!itemVoucher) {
            throw new Error(`Voucher sản phẩm ${item.selectedVoucherId} không hợp lệ hoặc không áp dụng cho sản phẩm này`);
          }

          // Kiểm tra số lượng voucher còn đủ không
          const currentUsage = productVoucherUsage.get(item.selectedVoucherId) || 0;
          if (currentUsage + 1 > itemVoucher.Quantity) {
            throw new Error(`Voucher ${itemVoucher.VoucherName} không đủ số lượng (cần ${currentUsage + 1}, có ${itemVoucher.Quantity})`);
          }

          // Cập nhật số lần sử dụng
          productVoucherUsage.set(item.selectedVoucherId, currentUsage + 1);
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
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          shipTypeId: item.selectedShipTypeId,
          shipFee: shipFee,
          feeId: feeId,
          voucherId: item.selectedVoucherId || null,
          itemDiscount: itemDiscount // Lưu discount để sử dụng sau
        });
      }

      // 6. Tính discount cho voucher toàn đơn nếu có
      if (orderVoucher) {
        // Tính tổng giá trị sản phẩm sau khi đã áp dụng voucher sản phẩm
        const productTotalAfterItemDiscount = orderItemsData.reduce(
          (sum, item) => sum + (item.unitPrice * item.quantity - item.itemDiscount), 0
        );

        if (orderVoucher.DiscountType === 'ship') {
          const totalShip = orderItemsData.reduce((sum, item) => sum + item.shipFee, 0);
          const shipDiscount = Math.min(totalShip, orderVoucher.DiscountValue);
          grandTotal -= shipDiscount;
        } else if (orderVoucher.DiscountType === 'percent') {
          const orderDiscount = Math.floor(productTotalAfterItemDiscount * orderVoucher.DiscountValue / 100);
          const maxDiscount = orderVoucher.MaxDiscount || Infinity;
          const finalDiscount = Math.min(orderDiscount, maxDiscount);
          grandTotal -= finalDiscount;
        } else if (orderVoucher.DiscountType === 'fixed') {
          const fixedDiscount = orderVoucher.DiscountValue;
          grandTotal -= fixedDiscount;
        }
      }

      // Đảm bảo grandTotal không âm
      grandTotal = Math.max(grandTotal, 0);

      // 7. Tạo đơn hàng
      const orderDate = new Date().toISOString().split('T')[0];
      const orderData = {
        accountId,
        addressId,
        methodId: paymentMethodId,
        orderVoucherId: orderVoucherId || null,
        grandTotal,
        orderDate,
        orderItems: orderItemsData,
        cartIds: isBuyNow ? [] : cartIds
      };

      // Tạo đơn hàng với transaction (bao gồm cả xử lý voucher)
      const result = await Order.createOrderTransactionWithVouchers(
        connection, 
        orderData, 
        productVoucherUsage, 
        orderVoucherId
      );

      await connection.commit();

      res.json({ 
        message: "Đặt hàng thành công", 
        orderId: result.orderId,
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