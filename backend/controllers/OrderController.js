const OrderModel = require("../models/Order");
const VoucherUsage = require("../models/VoucherUsage");
const ShipType = require("../models/ShipType");
const { pool } = require("../config/db");

// Status cho Orders
const ORDER_STATUS = {
  PENDING_PAYMENT: 1,          // Chờ thanh toán
  PROCESSING: 2,              // Đang xử lý
  SHIPPING: 3,                // Đang giao
  COMPLETED: 4,               // Hoàn thành
  CANCELLED: 5,               // Đã hủy
  RETURNED: 6,                // Trả hàng
  WAITING_OTHER_SELLERS: 7    // Chờ gian hàng khác
};

// Status cho OrderDetails
const ORDER_DETAIL_STATUS = {
  PENDING_PREPARED: 1,        // Chờ chuẩn bị
  PREPARED: 2,                // Đã chuẩn bị xong
  SHIPPING: 3,                // Đang giao
  COMPLETED: 4,               // Hoàn thành
  CANCELLED: 5,               // Đã hủy
  RETURNED: 6                 // Trả hàng
};

const OrderController = {
  // ==================== BUYER CONTROLLERS ====================
  
  checkout: async (req, res) => {
    try {
      const { cartIds } = req.body;
      const accountId = req.user.AccountId;
      const checkoutData = await OrderModel.getCheckoutData(accountId, cartIds);
      
      // Format image URL và đảm bảo có totalPrice
      const itemsWithImages = checkoutData.items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`,
        totalPrice: Number(item.totalPrice) || (item.UnitPrice * item.Quantity),
        UnitPrice: Number(item.UnitPrice) || Number(item.ProductPrice) || 0
      }));

      res.json({
        items: itemsWithImages,
        orderVouchers: checkoutData.orderVouchers,
        allVouchers: checkoutData.allVouchers
      });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: err.message || "Lỗi server" });
    }
  },

  checkoutBuyNow: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { productId, quantity } = req.body;
      const checkoutData = await OrderModel.getBuyNowData(accountId, productId, quantity);

      if (!checkoutData.items.length) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      // Format image URL
      const itemsWithImages = checkoutData.items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`,
        totalPrice: Number(item.totalPrice) || (item.UnitPrice * item.Quantity),
        UnitPrice: Number(item.UnitPrice) || 0
      }));

      return res.json({
        items: itemsWithImages,
        orderVouchers: checkoutData.orderVouchers,
        allVouchers: checkoutData.allVouchers
      });
    } catch (err) {
      console.error("checkoutBuyNow:", err);
      return res.status(500).json({ message: err.message || "Checkout buy now failed" });
    }
  },

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
        const product = await OrderModel.getProductDetails(item.productId);
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
        if (orderTotal < orderVoucher.MinOrderValue) {
          throw new Error(`Voucher toàn đơn yêu cầu đơn hàng tối thiểu ${orderVoucher.MinOrderValue}đ`);
        }
      }

      // 5. Tính toán và validate
      let grandTotal = 0;
      const orderItemsData = [];
      const productVoucherUsage = new Map();

      for (const item of items) {
        const product = await OrderModel.getProductDetails(item.productId);
        if (!product) {
          throw new Error(`Sản phẩm ${item.productId} không khả dụng`);
        }

        if (!item.quantity || item.quantity < 1) {
          throw new Error(`Số lượng sản phẩm ${item.productId} không hợp lệ`);
        }

        const [shipTypeRows] = await connection.query(
          "SELECT * FROM ShipType WHERE ShipTypeId = ?",
          [item.selectedShipTypeId]
        );
        if (!shipTypeRows.length) {
          throw new Error(`Phương thức vận chuyển không hợp lệ cho sản phẩm ${item.productId}`);
        }

        let itemVoucher = null;
        if (item.selectedVoucherId) {
          itemVoucher = await VoucherUsage.validateVoucherForProduct(item.selectedVoucherId, accountId, product.StallId);
          if (!itemVoucher) {
            throw new Error(`Voucher sản phẩm ${item.selectedVoucherId} không hợp lệ`);
          }

          const currentUsage = productVoucherUsage.get(item.selectedVoucherId) || 0;
          if (currentUsage + 1 > itemVoucher.Quantity) {
            throw new Error(`Voucher ${itemVoucher.VoucherName} không đủ số lượng`);
          }
          productVoucherUsage.set(item.selectedVoucherId, currentUsage + 1);
        }

        const unitPrice = product.Price;
        const itemTotal = unitPrice * item.quantity;
        const shipFee = shipTypeRows[0].ShipFee;

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

        const feeId = await OrderModel.getApplicableFee(unitPrice);
        const itemFinalPrice = itemTotal - itemDiscount + shipFee;
        grandTotal += itemFinalPrice;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          shipTypeId: item.selectedShipTypeId,
          shipFee: shipFee,
          feeId: feeId,
          voucherId: item.selectedVoucherId || null,
          itemDiscount: itemDiscount
        });
      }

      // 6. Tính discount cho voucher toàn đơn nếu có
      if (orderVoucher) {
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

      grandTotal = Math.max(grandTotal, 0);

      // 7. Tạo đơn hàng
      const orderDate = new Date().toISOString().split('T')[0];
      const initialStatus = paymentMethodId === 1 ? ORDER_STATUS.PROCESSING : ORDER_STATUS.PENDING_PAYMENT;

      const orderData = {
        accountId,
        addressId,
        methodId: paymentMethodId,
        orderVoucherId: orderVoucherId || null,
        grandTotal,
        orderDate,
        orderItems: orderItemsData,
        cartIds: isBuyNow ? [] : cartIds,
        initialStatus
      };

      const result = await OrderModel.createOrderTransactionWithVouchers(
        connection,
        orderData,
        productVoucherUsage
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
      const orders = await OrderModel.getOrdersByAccountId(accountId);
      res.json(orders);
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  getOrderDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;
      const orderDetail = await OrderModel.getOrderDetailById(orderId, accountId);

      if (!orderDetail.order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const detailsWithImages = orderDetail.details.map(detail => ({
        ...detail,
        Image: detail.Image
          ? (detail.Image.startsWith('http')
            ? detail.Image
            : `${baseUrl}/uploads/ProductImage/${detail.Image}`)
          : null
      }));

      res.json({
        order: orderDetail.order,
        details: detailsWithImages,
        history: orderDetail.history,
        payments: orderDetail.payments,
        itemCount: orderDetail.itemCount
      });

    } catch (error) {
      console.error("Get order detail error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy chi tiết đơn hàng",
        error: error.message
      });
    }
  },

  cancelOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;
      await OrderModel.cancelOrderById(orderId, accountId);
      res.json({ message: "Đã hủy đơn hàng thành công" });
    } catch (error) {
      res.status(400).json({ message: error.message || "Không thể huỷ đơn hàng ở trạng thái hiện tại!" });
    }
  },

  reorder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;
      await OrderModel.reorderById(orderId, accountId);
      res.json({ message: "Đã thêm sản phẩm vào giỏ hàng" });
    } catch (error) {
      console.error("Reorder error:", error);
      res.status(500).json({ message: "Lỗi khi mua lại đơn hàng" });
    }
  },

  // ==================== SELLER CONTROLLERS ====================

  getSellerOrders: async (req, res) => {
    try {
      const sellerId = req.user.AccountId;
      const filters = {
        status: req.query.status || 'all',
        search: req.query.search || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        orderId: req.query.orderId || '',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      // Validate date range
      if (filters.dateFrom && filters.dateTo) {
        if (new Date(filters.dateTo) < new Date(filters.dateFrom)) {
          return res.status(400).json({ message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu" });
        }
      }

      const result = await OrderModel.getSellerOrders(sellerId, filters);
      res.json(result.orders);
    } catch (error) {
      console.error("Get seller orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  getSellerOrderDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      const sellerId = req.user.AccountId;
      const orderDetail = await OrderModel.getSellerOrderDetail(orderId, sellerId);
      res.json(orderDetail);
    } catch (error) {
      console.error("Get seller order detail error:", error);
      res.status(500).json({ message: error.message || "Lỗi khi lấy chi tiết đơn hàng" });
    }
  },

  prepareOrderItem: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const { isPrepared } = req.body;
      const sellerId = req.user.AccountId;

      const result = await OrderModel.prepareOrderItem(orderDetailId, sellerId, isPrepared);
      res.json({
        message: isPrepared ? "Đã đánh dấu chuẩn bị hàng" : "Đã bỏ đánh dấu chuẩn bị hàng",
        orderDetailId: result.orderDetailId,
        newStatus: result.newStatus,
        allPrepared: result.allPrepared
      });

    } catch (error) {
      console.error("Prepare order item error:", error);
      res.status(400).json({ message: error.message || "Không thể cập nhật trạng thái" });
    }
  },

  shipSellerOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      const result = await OrderModel.shipSellerOrder(orderId, sellerId);
      res.json({
        message: "Đơn hàng đã được chuyển sang trạng thái đang giao",
        orderId: result.orderId,
        newOrderStatus: result.newOrderStatus
      });

    } catch (error) {
      console.error("Shipping error:", error);
      res.status(400).json({ message: error.message || "Không thể chuyển trạng thái đơn hàng" });
    }
  },

  completeSellerOrder: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const sellerId = req.user.AccountId;

      const result = await OrderModel.completeSellerOrder(orderDetailId, sellerId);
      res.json({
        message: "Đã xác nhận giao hàng thành công",
        orderDetailId: result.orderDetailId,
        newStatus: result.newStatus
      });

    } catch (error) {
      console.error("Complete seller order error:", error);
      res.status(400).json({ message: error.message || "Không thể xác nhận hoàn thành" });
    }
  },

  shipAllItemsForSeller: async (req, res) => {
    try {
      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      const result = await OrderModel.shipAllItemsForSeller(orderId, sellerId);
      res.json({
        message: "Đã chuyển tất cả sản phẩm sang trạng thái đang giao",
        orderId: result.orderId,
        updatedItems: result.updatedItems,
        newOrderStatus: result.newOrderStatus
      });

    } catch (error) {
      console.error("Ship all items error:", error);
      res.status(400).json({ message: error.message || "Không thể chuyển trạng thái" });
    }
  },

  checkOrderDetailStatus: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const sellerId = req.user.AccountId;

      const result = await OrderModel.checkOrderDetailStatus(orderDetailId, sellerId);
      res.json(result);

    } catch (error) {
      console.error("Check order detail error:", error);
      res.status(500).json({ message: error.message || "Lỗi server" });
    }
  },
  
};

module.exports = OrderController;