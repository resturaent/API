const {
  Order,
  OrderItem,
  Product,
  Table,
  Employee,
  Payment,
  InventoryLog,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

const orderController = {
  // ==================== GET ALL ORDERS ====================
  async getAllOrders(req, res) {
    try {
      const { status, date, table_id, employee_id } = req.query;

      let whereClause = {};
      if (status) whereClause.status = status;
      if (table_id) whereClause.table_id = table_id;
      if (employee_id) whereClause.employee_id = employee_id;

      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        whereClause.order_date = {
          [Op.between]: [startDate, endDate],
        };
      }

      const orders = await Order.findAll({
        where: whereClause,
        include: [
          {
            model: Table,
            as: "table",
            attributes: ["table_id", "table_number", "location", "status"],
          },
          {
            model: Employee,
            as: "waiter",
            attributes: ["employee_id", "employee_name", "role"],
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: [
                  "product_id",
                  "product_name",
                  "price",
                  "category_id",
                ],
              },
            ],
          },
          {
            model: Payment,
            as: "payment",
          },
        ],
        order: [["order_date", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE ORDER ====================
  async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id, {
        include: [
          {
            model: Table,
            as: "table",
          },
          {
            model: Employee,
            as: "waiter",
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
              },
            ],
          },
          {
            model: Payment,
            as: "payment",
            include: [
              {
                model: Employee,
                as: "cashier",
                attributes: ["employee_id", "employee_name"],
              },
            ],
          },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order",
        error: error.message,
      });
    }
  },

  // ==================== CREATE ORDER ====================
  async createOrder(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        table_id,
        employee_id,
        customer_name,
        customer_phone,
        items, // Array of { product_id, quantity, notes }
        discount = 0,
        tax = 0,
        notes,
      } = req.body;

      // Validate required fields
      if (!table_id || !items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Table and items are required",
        });
      }

      // Check if table exists
      const table = await Table.findByPk(table_id);
      if (!table) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = await Product.findByPk(item.product_id);

        if (!product) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Product with ID ${item.product_id} not found`,
          });
        }

        if (!product.is_available) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Product "${product.product_name}" is not available`,
          });
        }

        // Check stock availability
        if (product.quantity_in_stock < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.product_name}". Available: ${product.quantity_in_stock}`,
          });
        }

        const subtotal = parseFloat(product.price) * item.quantity;
        totalAmount += subtotal;

        orderItemsData.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: subtotal,
          notes: item.notes || null,
        });
      }

      // Create order
      const order = await Order.create(
        {
          table_id,
          employee_id: employee_id || null,
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          total_amount: totalAmount,
          discount: discount || 0,
          tax: tax || 0,
          notes: notes || null,
          status: "pending",
        },
        { transaction }
      );

      // Create order items
      for (const itemData of orderItemsData) {
        await OrderItem.create(
          {
            order_id: order.order_id,
            ...itemData,
          },
          { transaction }
        );

        // Update product stock
        const product = await Product.findByPk(itemData.product_id);
        await product.updateStock(
          -itemData.quantity,
          "sale",
          `Order #${order.order_id}`,
          employee_id,
          order.order_id
        );
      }

      // Update table status to occupied
      await table.update({ status: "occupied" }, { transaction });

      await transaction.commit();

      // Fetch complete order with relations
      const createdOrder = await Order.findByPk(order.order_id, {
        include: [
          {
            model: Table,
            as: "table",
          },
          {
            model: Employee,
            as: "waiter",
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
              },
            ],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: createdOrder,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE ORDER ====================
  async updateOrder(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { customer_name, customer_phone, discount, tax, notes, status } =
        req.body;

      const order = await Order.findByPk(id);

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if order can be modified
      if (!order.canBeModified() && status !== "cancelled") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Order cannot be modified at this stage",
        });
      }

      await order.update(
        {
          customer_name:
            customer_name !== undefined ? customer_name : order.customer_name,
          customer_phone:
            customer_phone !== undefined
              ? customer_phone
              : order.customer_phone,
          discount: discount !== undefined ? discount : order.discount,
          tax: tax !== undefined ? tax : order.tax,
          notes: notes !== undefined ? notes : order.notes,
          status: status || order.status,
        },
        { transaction }
      );

      await transaction.commit();

      const updatedOrder = await Order.findByPk(id, {
        include: [
          {
            model: Table,
            as: "table",
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
              },
            ],
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: updatedOrder,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update order",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE ORDER STATUS ====================
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "completed",
        "cancelled",
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const order = await Order.findByPk(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      await order.updateStatus(status);

      // If order is completed, free the table
      if (status === "completed") {
        const table = await Table.findByPk(order.table_id);
        if (table) {
          await table.free();
        }
      }

      res.status(200).json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
      });
    }
  },

  // ==================== DELETE ORDER ====================
  async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Only allow deletion of pending or cancelled orders
      if (!["pending", "cancelled"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Only pending or cancelled orders can be deleted",
        });
      }

      await order.destroy();

      res.status(200).json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete order",
        error: error.message,
      });
    }
  },

  // ==================== ADD ITEM TO ORDER ====================
  async addItemToOrder(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { product_id, quantity, notes } = req.body;

      const order = await Order.findByPk(id);

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (!order.canBeModified()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot modify order at this stage",
        });
      }

      const product = await Product.findByPk(product_id);

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (!product.is_available || product.quantity_in_stock < quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Product not available or insufficient stock",
        });
      }

      const subtotal = parseFloat(product.price) * quantity;

      const orderItem = await OrderItem.create(
        {
          order_id: id,
          product_id,
          quantity,
          unit_price: product.price,
          subtotal,
          notes: notes || null,
        },
        { transaction }
      );

      // Update product stock
      await product.updateStock(
        -quantity,
        "sale",
        `Order #${id}`,
        order.employee_id,
        id
      );

      // Update order total
      const newTotal = parseFloat(order.total_amount) + subtotal;
      await order.update({ total_amount: newTotal }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: "Item added to order successfully",
        data: orderItem,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error adding item to order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add item to order",
        error: error.message,
      });
    }
  },

  // ==================== REMOVE ITEM FROM ORDER ====================
  async removeItemFromOrder(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id, item_id } = req.params;

      const order = await Order.findByPk(id);

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (!order.canBeModified()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot modify order at this stage",
        });
      }

      const orderItem = await OrderItem.findOne({
        where: { order_item_id: item_id, order_id: id },
      });

      if (!orderItem) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order item not found",
        });
      }

      // Restore product stock
      const product = await Product.findByPk(orderItem.product_id);
      await product.updateStock(
        orderItem.quantity,
        "adjustment",
        `Removed from Order #${id}`,
        order.employee_id,
        null
      );

      // Update order total
      const newTotal =
        parseFloat(order.total_amount) - parseFloat(orderItem.subtotal);
      await order.update({ total_amount: newTotal }, { transaction });

      await orderItem.destroy({ transaction });

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: "Item removed from order successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error removing item from order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove item from order",
        error: error.message,
      });
    }
  },

  // ==================== GET ORDERS BY STATUS ====================
  async getOrdersByStatus(req, res) {
    try {
      const { status } = req.params;

      const validStatuses = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "completed",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      const orders = await Order.findAll({
        where: { status },
        include: [
          {
            model: Table,
            as: "table",
            attributes: ["table_number", "location"],
          },
          {
            model: Employee,
            as: "waiter",
            attributes: ["employee_name"],
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["product_name", "price"],
              },
            ],
          },
        ],
        order: [["order_date", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error("Error fetching orders by status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  },

  // ==================== GET ORDERS BY TABLE ====================
  async getOrdersByTable(req, res) {
    try {
      const { table_id } = req.params;

      const orders = await Order.findAll({
        where: {
          table_id,
          status: { [Op.notIn]: ["completed", "cancelled"] },
        },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
              },
            ],
          },
          {
            model: Employee,
            as: "waiter",
          },
        ],
        order: [["order_date", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error("Error fetching orders by table:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  },

  // ==================== GET ORDER STATISTICS ====================
  async getOrderStatistics(req, res) {
    try {
      const totalOrders = await Order.count();
      const pendingOrders = await Order.count({ where: { status: "pending" } });
      const completedOrders = await Order.count({
        where: { status: "completed" },
      });
      const cancelledOrders = await Order.count({
        where: { status: "cancelled" },
      });

      // Today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = await Order.count({
        where: {
          order_date: { [Op.gte]: today },
        },
      });

      // Today's revenue
      const todayRevenue = await Order.sum("final_amount", {
        where: {
          order_date: { [Op.gte]: today },
          status: "completed",
        },
      });

      res.status(200).json({
        success: true,
        data: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          today_orders: todayOrders,
          today_revenue: parseFloat(todayRevenue || 0).toFixed(2),
        },
      });
    } catch (error) {
      console.error("Error fetching order statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order statistics",
        error: error.message,
      });
    }
  },
};

module.exports = orderController;
