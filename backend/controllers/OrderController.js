const Order = require("../models/Order");
const ShipType = require("../models/ShipType");
const VoucherUsage = require("../models/VoucherUsage");
const OrderDetail = require("../models/OrderDetail");
const { pool } = require("../config/db");
const ORDER_STATUS = {
  PENDING_PAYMENT: 1,
  PROCESSING: 2,
  SHIPPING: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  RETURNED: 6,
  WAITING_OTHER_SELLERS: 7 // Chờ gian hàng khác gửi hàng
};

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
      const initialStatus = methodId === 1 ? ORDER_STATUS.PROCESSING : ORDER_STATUS.PENDING_PAYMENT;

      const orderData = {
        accountId,
        addressId,
        methodId: paymentMethodId,
        orderVoucherId: orderVoucherId || null,
        grandTotal,
        orderDate,
        orderItems: orderItemsData,
        cartIds: isBuyNow ? [] : cartIds,
        initialStatus  // Thêm trạng thái ban đầu
      };

      // Sửa lời gọi hàm
      const result = await Order.createOrderTransactionWithVouchers(
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

      // Gọi model để lấy danh sách đơn hàng
      const orders = await Order.getOrdersByAccountId(accountId);
      res.json(orders);
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  // backend/controllers/OrderController.js
  getOrderDetail: async (req, res) => {
    try {
      console.log("=== GET ORDER DETAIL REQUEST ===");
      console.log("Order ID:", req.params.orderId);
      console.log("Account ID:", req.user.AccountId);

      const { orderId } = req.params;
      const accountId = req.user.AccountId;

      // Gọi model để lấy chi tiết đơn hàng
      const orderDetail = await Order.getOrderDetailById(orderId, accountId);

      console.log("Order detail result:", orderDetail);

      if (!orderDetail.order) {
        console.log("Order not found");
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Lấy base URL cho ảnh
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      // Format image URL
      const detailsWithImages = orderDetail.details.map(detail => ({
        ...detail,
        // Kiểm tra nếu Image đã là full URL thì giữ nguyên, nếu không thì thêm baseUrl
        Image: detail.Image
          ? (detail.Image.startsWith('http')
            ? detail.Image
            : `${baseUrl}/uploads/ProductImage/${detail.Image}`)
          : null
      }));

      console.log("Successfully fetched order detail");

      res.json({
        order: orderDetail.order,
        details: detailsWithImages,
        history: orderDetail.history,
        payments: orderDetail.payments,
        itemCount: orderDetail.itemCount
      });

    } catch (error) {
      console.error("Get order detail error:", error);
      console.error("Error stack:", error.stack);
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

      // Gọi model để hủy đơn hàng
      await Order.cancelOrderById(orderId, accountId);
      res.json({ message: "Đã hủy đơn hàng thành công" });

    } catch (error) {
      res.status(400).json({ message: error.message || "Không thể huỷ đơn hàng ở trạng thái hiện tại!" });
    }
  },

  reorder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;

      // Gọi model để mua lại đơn hàng
      await Order.reorderById(orderId, accountId);
      res.json({ message: "Đã thêm sản phẩm vào giỏ hàng" });

    } catch (error) {
      console.error("Reorder error:", error);
      res.status(500).json({ message: "Lỗi khi mua lại đơn hàng" });
    }
  },

  getSellerOrders: async (req, res) => {
    try {
      const sellerId = req.user.AccountId;
      const { status, search, dateFrom, dateTo } = req.query;

      // Lấy stallId của seller
      const [stallRows] = await pool.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        return res.status(404).json({ message: "Không tìm thấy cửa hàng" });
      }

      const stallId = stallRows[0].StallId;

      let query = `
         SELECT DISTINCT
        o.OrderId,
        o.OrderDate,
        o.FinalPrice,
        o.Status as OrderStatus,
        o.CreatedAt,
        o.UpdatedAt,
        a.Content as AddressContent,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        acc.Name as CustomerName,
        acc.Phone as CustomerPhone,
        pm.MethodName,
        (
          SELECT COUNT(*) 
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (2,3,4,5)  -- Chỉ đếm sản phẩm có status từ 2-5
        ) as itemCount,
        (
          SELECT SUM(od2.UnitPrice * od2.Quantity)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (2,3,4,5)  -- Chỉ tính sản phẩm có status từ 2-5
        ) as SubTotal,
        (
          SELECT SUM(od2.ShipFee)
          FROM OrderDetails od2 
          WHERE od2.OrderId = o.OrderId 
            AND od2.ProductId IN (
              SELECT ProductId FROM Products WHERE StallId = ?
            )
            AND od2.Status IN (2,3,4,5)  -- Chỉ tính sản phẩm có status từ 2-5
        ) as ShipFee
      FROM Orders o
      JOIN Address a ON o.AddressId = a.AddressId
      JOIN Accounts acc ON o.AccountId = acc.AccountId
      LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
      WHERE EXISTS (
        SELECT 1 FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE od.OrderId = o.OrderId
          AND p.StallId = ?
          AND od.Status IN (2,3,4,5)  -- Chỉ xem sản phẩm có status từ 2-5
      )
      AND o.Status IN (2,3,4,5)  -- Chỉ xem đơn hàng có status từ 2-5
      `;

      const params = [stallId, stallId, stallId, stallId];

      // Thêm điều kiện lọc
      if (status && status !== "all") {
        query += " AND o.Status = ?";
        params.push(status);
      }

      if (dateFrom && dateTo) {
        // Kiểm tra dateTo >= dateFrom
        if (new Date(dateTo) >= new Date(dateFrom)) {
          query += " AND DATE(o.CreatedAt) BETWEEN ? AND ?";
          params.push(dateFrom, dateTo);
        } else {
          return res.status(400).json({ message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu" });
        }
      } else if (dateFrom) {
        query += " AND DATE(o.CreatedAt) >= ?";
        params.push(dateFrom);
      } else if (dateTo) {
        query += " AND DATE(o.CreatedAt) <= ?";
        params.push(dateTo);
      }

      if (search) {
        query += " AND (o.OrderId LIKE ? OR acc.Name LIKE ? OR acc.Phone LIKE ?)";
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      // Thêm điều kiện tìm kiếm theo OrderId riêng nếu có
      if (req.query.orderId) {
        query += " AND o.OrderId = ?";
        params.push(req.query.orderId);
      }

      query += " ORDER BY o.CreatedAt DESC";

      const [orders] = await pool.query(query, params);

      // Lấy thông tin chi tiết sản phẩm cho từng đơn hàng
      for (const order of orders) {
        const [details] = await pool.query(
          `
          SELECT 
          od.*,
          p.ProductName,
          p.Image,
          p.StallId,
          s.StallName
        FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE od.OrderId = ?
          AND p.StallId = ?
          AND od.Status IN (2,3,4,5)  -- Chỉ lấy sản phẩm có status từ 2-5
        ORDER BY od.CreatedAt ASC
          `,
          [order.OrderId, stallId]
        );

        order.details = details.map(detail => ({
          ...detail,
          Status: detail.Status // Trạng thái của order detail
        }));
      }

      res.json(orders);
    } catch (error) {
      console.error("Get seller orders error:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
    }
  },

  // Lấy chi tiết đơn hàng cho seller (chỉ sản phẩm thuộc stall của seller)
  getSellerOrderDetail: async (req, res) => {
    try {
      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      // Lấy stallId của seller
      const [stallRows] = await pool.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        return res.status(404).json({ message: "Không tìm thấy cửa hàng" });
      }

      const stallId = stallRows[0].StallId;

      // Lấy thông tin đơn hàng
      const [orderRows] = await pool.query(
        `SELECT 
        o.OrderId,
        o.OrderDate,
        o.FinalPrice,
        o.Status as OrderStatus,
        o.CreatedAt,
        a.Content as AddressContent,
        a.Name as AddressName,
        a.Phone as AddressPhone,
        acc.Name as CustomerName,
        acc.Phone as CustomerPhone,
        pm.MethodName
       FROM Orders o
       JOIN Address a ON o.AddressId = a.AddressId
       JOIN Accounts acc ON o.AccountId = acc.AccountId
       LEFT JOIN PaymentMethods pm ON o.MethodId = pm.MethodId
       WHERE o.OrderId = ?
         AND o.Status IN (2,3,4,5)  -- Chỉ xem đơn hàng có status từ 2-5
         AND EXISTS (
           SELECT 1 FROM OrderDetails od
           JOIN Products p ON od.ProductId = p.ProductId
           WHERE od.OrderId = o.OrderId
             AND p.StallId = ?
             AND od.Status IN (2,3,4,5)  -- Chỉ xem sản phẩm có status từ 2-5
         )`,
        [orderId, stallId]
      );

      if (!orderRows.length) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Lấy chi tiết sản phẩm (chỉ của stall này)
      const [detailRows] = await pool.query(
        `SELECT 
        od.*,
        p.ProductName,
        p.Image,
        p.StallId,
        s.StallName,
        st.Content as ShipTypeContent,
        pf.PercentValue as PlatformFeePercent
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       JOIN Stalls s ON p.StallId = s.StallId
       LEFT JOIN ShipType st ON od.ShipTypeId = st.ShipTypeId
       LEFT JOIN PlatformFees pf ON od.FeeId = pf.FeeId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status IN (2,3,4,5)  -- Chỉ lấy sản phẩm có status từ 2-5
       ORDER BY od.CreatedAt ASC`,
        [orderId, stallId]
      );

      // Đếm số sản phẩm
      const itemCount = detailRows.length;

      res.json({
        order: orderRows[0],
        details: detailRows,
        itemCount: itemCount
      });
    } catch (error) {
      console.error("Get seller order detail error:", error);
      res.status(500).json({ message: "Lỗi khi lấy chi tiết đơn hàng" });
    }
  },

  // Cập nhật trạng thái chuẩn bị hàng (chỉ sản phẩm thuộc stall của seller)
  prepareOrderItem: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { orderDetailId } = req.params;
      const { isPrepared } = req.body;
      const sellerId = req.user.AccountId;

      // 1. Kiểm tra order detail có thuộc stall của seller không
      const [checkRows] = await connection.query(
        `SELECT od.*, p.StallId 
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderDetailId = ?
           AND s.AccountId = ?`,
        [orderDetailId, sellerId]
      );

      if (!checkRows.length) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      const orderDetail = checkRows[0];

      // 2. Chỉ cho phép chuẩn bị khi trạng thái là PROCESSING (2)
      if (orderDetail.Status !== ORDER_STATUS.PROCESSING) {
        throw new Error("Chỉ có thể chuẩn bị hàng khi đơn hàng đang ở trạng thái xử lý");
      }

      // 3. Cập nhật trạng thái (nếu isPrepared = true thì Status = 3 - SHIPPING)
      const newStatus = isPrepared ? ORDER_STATUS.SHIPPING : ORDER_STATUS.PROCESSING;

      await connection.query(
        `UPDATE OrderDetails 
         SET Status = ?, UpdatedAt = NOW() 
         WHERE OrderDetailId = ?`,
        [newStatus, orderDetailId]
      );

      // 4. Tạo lịch sử trạng thái
      const trackingCode = `PREPARE-${orderDetailId}-${Date.now()}`;
      const statusText = isPrepared ? 'Đã chuẩn bị hàng' : 'Bỏ chuẩn bị hàng';

      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, ?, NOW())`,
        [orderDetailId, trackingCode, statusText]
      );

      // 5. Kiểm tra nếu tất cả sản phẩm trong order đã được chuẩn bị
      const [allItems] = await connection.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN od.Status = ${ORDER_STATUS.SHIPPING} THEN 1 ELSE 0 END) as prepared
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderId = ?
           AND s.AccountId = ?`,
        [orderDetail.OrderId, sellerId]
      );

      // Nếu tất cả sản phẩm đã được chuẩn bị, tự động chuyển sang SHIPPING
      if (allItems[0].total === allItems[0].prepared && allItems[0].total > 0) {
        await connection.query(
          `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
          [ORDER_STATUS.SHIPPING, orderDetail.OrderId]
        );
      }

      await connection.commit();

      res.json({
        message: isPrepared ? "Đã đánh dấu chuẩn bị hàng" : "Đã bỏ đánh dấu chuẩn bị hàng",
        orderDetailId: orderDetailId,
        newStatus: newStatus
      });

    } catch (error) {
      await connection.rollback();
      console.error("Prepare order item error:", error);
      res.status(400).json({ message: error.message || "Không thể cập nhật trạng thái" });
    } finally {
      connection.release();
    }
  },

  // Chuyển trạng thái đơn hàng sang đang giao (cho seller)
  shipSellerOrder: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      // 1. Kiểm tra seller có sản phẩm trong order này không
      const [stallRows] = await connection.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        throw new Error("Không tìm thấy cửa hàng");
      }

      const stallId = stallRows[0].StallId;

      // 2. Kiểm tra xem tất cả sản phẩm của seller đã được chuẩn bị chưa
      const [itemsRows] = await connection.query(
        `SELECT od.* 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      if (itemsRows.length > 0) {
        throw new Error("Vẫn còn sản phẩm chưa được chuẩn bị");
      }

      // 3. Cập nhật tất cả order details của seller sang SHIPPING
      await connection.query(
        `UPDATE OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       SET od.Status = ${ORDER_STATUS.SHIPPING}, od.UpdatedAt = NOW()
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ${ORDER_STATUS.PROCESSING}`, // Chỉ cập nhật những cái đang xử lý
        [orderId, stallId]
      );

      // 4. Tạo lịch sử trạng thái cho từng order detail
      const [detailRows] = await connection.query(
        `SELECT od.OrderDetailId 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?`,
        [orderId, stallId]
      );

      for (const detail of detailRows) {
        const trackingCode = `SHIP-${orderId}-${detail.OrderDetailId}-${Date.now()}`;
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đang giao hàng', NOW())`,
          [detail.OrderDetailId, trackingCode]
        );
      }

      // 5. Kiểm tra xem có seller khác chưa gửi hàng không
      const [otherSellersItems] = await connection.query(
        `SELECT COUNT(DISTINCT p.StallId) as otherStalls
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId != ?
         AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      // 6. Xác định trạng thái đơn hàng mới
      let newOrderStatus;
      if (otherSellersItems[0].otherStalls > 0) {
        // Còn seller khác chưa gửi hàng
        newOrderStatus = ORDER_STATUS.WAITING_OTHER_SELLERS;
      } else {
        // Tất cả seller đã gửi hàng
        newOrderStatus = ORDER_STATUS.SHIPPING;

        // Cập nhật tất cả order details khác còn đang xử lý
        await connection.query(
          `UPDATE OrderDetails 
         SET Status = ${ORDER_STATUS.SHIPPING}, UpdatedAt = NOW()
         WHERE OrderId = ? AND Status = ${ORDER_STATUS.PROCESSING}`,
          [orderId]
        );
      }

      // 7. Cập nhật trạng thái đơn hàng
      await connection.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [newOrderStatus, orderId]
      );

      await connection.commit();

      res.json({
        message: "Đơn hàng đã được chuyển sang trạng thái đang giao",
        orderId: orderId,
        newOrderStatus: newOrderStatus
      });

    } catch (error) {
      await connection.rollback();
      console.error("Shipping error:", error);
      res.status(400).json({ message: error.message || "Không thể chuyển trạng thái đơn hàng" });
    } finally {
      connection.release();
    }
  },

  // Xác nhận hoàn thành đơn hàng (cho seller)
  completeSellerOrder: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { orderDetailId } = req.params;
      const sellerId = req.user.AccountId;

      // 1. Kiểm tra order detail có thuộc stall của seller không
      const [checkRows] = await connection.query(
        `SELECT od.*, p.StallId, od.OrderId
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderDetailId = ?
           AND s.AccountId = ?`,
        [orderDetailId, sellerId]
      );

      if (!checkRows.length) {
        throw new Error("Không có quyền truy cập sản phẩm này");
      }

      const orderDetail = checkRows[0];

      // 2. Chỉ cho phép hoàn thành khi trạng thái là SHIPPING (3)
      if (orderDetail.Status !== ORDER_STATUS.SHIPPING) {
        throw new Error("Chỉ có thể xác nhận hoàn thành khi đơn hàng đang ở trạng thái đang giao");
      }

      // 3. Cập nhật trạng thái sang COMPLETED
      await connection.query(
        `UPDATE OrderDetails 
         SET Status = ?, UpdatedAt = NOW() 
         WHERE OrderDetailId = ?`,
        [ORDER_STATUS.COMPLETED, orderDetailId]
      );

      // 4. Tạo lịch sử trạng thái
      const trackingCode = `COMPLETE-${orderDetailId}-${Date.now()}`;
      await connection.query(
        `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, 'Đã giao hàng', NOW())`,
        [orderDetailId, trackingCode]
      );

      // 5. Kiểm tra nếu tất cả sản phẩm trong order đã hoàn thành
      const [allItems] = await connection.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN od.Status = ${ORDER_STATUS.COMPLETED} THEN 1 ELSE 0 END) as completed
         FROM OrderDetails od
         JOIN Products p ON od.ProductId = p.ProductId
         JOIN Stalls s ON p.StallId = s.StallId
         WHERE od.OrderId = ?
           AND s.AccountId = ?`,
        [orderDetail.OrderId, sellerId]
      );

      await connection.commit();

      res.json({
        message: "Đã xác nhận giao hàng thành công",
        orderDetailId: orderDetailId,
        newStatus: ORDER_STATUS.COMPLETED
      });

    } catch (error) {
      await connection.rollback();
      console.error("Complete seller order error:", error);
      res.status(400).json({ message: error.message || "Không thể xác nhận hoàn thành" });
    } finally {
      connection.release();
    }
  },

  // Ship all items for seller
  shipAllItemsForSeller: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const sellerId = req.user.AccountId;

      // Lấy stallId của seller
      const [stallRows] = await connection.query(
        "SELECT StallId FROM Stalls WHERE AccountId = ?",
        [sellerId]
      );

      if (!stallRows.length) {
        throw new Error("Không tìm thấy cửa hàng");
      }

      const stallId = stallRows[0].StallId;

      // 1. Cập nhật tất cả order details của seller sang SHIPPING
      const [updateResult] = await connection.query(
        `UPDATE OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       SET od.Status = ?, od.UpdatedAt = NOW()
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
        [ORDER_STATUS.SHIPPING, orderId, stallId, ORDER_STATUS.PROCESSING]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Không có sản phẩm nào để chuyển trạng thái");
      }

      // 2. Tạo lịch sử trạng thái
      const [detailRows] = await connection.query(
        `SELECT od.OrderDetailId 
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId = ?
         AND od.Status = ?`,
        [orderId, stallId, ORDER_STATUS.SHIPPING]
      );

      for (const detail of detailRows) {
        const trackingCode = `SHIP-ALL-${orderId}-${detail.OrderDetailId}-${Date.now()}`;
        await connection.query(
          `INSERT INTO OrderStatusHistory (OrderDetailId, TrackingCode, Status, CreatedAt)
         VALUES (?, ?, ?, NOW())`,
          [detail.OrderDetailId, trackingCode, 'Đang giao hàng']
        );
      }

      // 3. Kiểm tra xem có seller khác chưa gửi hàng không
      const [otherSellersItems] = await connection.query(
        `SELECT COUNT(DISTINCT p.StallId) as otherStalls
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       WHERE od.OrderId = ?
         AND p.StallId != ?
         AND od.Status = ${ORDER_STATUS.PROCESSING}`,
        [orderId, stallId]
      );

      // 4. Xác định trạng thái đơn hàng mới
      let newOrderStatus;
      if (otherSellersItems[0].otherStalls > 0) {
        newOrderStatus = ORDER_STATUS.WAITING_OTHER_SELLERS;
      } else {
        newOrderStatus = ORDER_STATUS.SHIPPING;

        // Cập nhật tất cả order details khác còn đang xử lý
        await connection.query(
          `UPDATE OrderDetails 
         SET Status = ${ORDER_STATUS.SHIPPING}, UpdatedAt = NOW()
         WHERE OrderId = ? AND Status = ${ORDER_STATUS.PROCESSING}`,
          [orderId]
        );
      }

      // 5. Cập nhật trạng thái đơn hàng
      await connection.query(
        `UPDATE Orders SET Status = ?, UpdatedAt = NOW() WHERE OrderId = ?`,
        [newOrderStatus, orderId]
      );

      await connection.commit();

      res.json({
        message: "Đã chuyển tất cả sản phẩm sang trạng thái đang giao",
        orderId: orderId,
        updatedItems: updateResult.affectedRows,
        newOrderStatus: newOrderStatus
      });

    } catch (error) {
      await connection.rollback();
      console.error("Ship all items error:", error);
      res.status(400).json({ message: error.message || "Không thể chuyển trạng thái" });
    } finally {
      connection.release();
    }
  },

  // Kiểm tra trạng thái order detail
  checkOrderDetailStatus: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const sellerId = req.user.AccountId;

      const [rows] = await pool.query(
        `SELECT 
        od.*,
        o.Status as orderStatus,
        p.StallId,
        s.AccountId
       FROM OrderDetails od
       JOIN Products p ON od.ProductId = p.ProductId
       JOIN Stalls s ON p.StallId = s.StallId
       JOIN Orders o ON od.OrderId = o.OrderId
       WHERE od.OrderDetailId = ?
         AND s.AccountId = ?`,
        [orderDetailId, sellerId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy" });
      }

      res.json({
        orderDetailId: orderDetailId,
        orderStatus: rows[0].orderStatus,
        hasShipped: rows[0].Status >= 3 // Đã gửi hàng nếu status >= 3
      });

    } catch (error) {
      console.error("Check order detail error:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  }


};

module.exports = OrderController;