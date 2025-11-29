const { Payment, Order, Employee, sequelize } = require("../models");
const { Op } = require("sequelize");

const paymentController = {
  // ==================== GET ALL PAYMENTS ====================
  async getAllPayments(req, res) {
    try {
      const { payment_method, date, employee_id } = req.query;

      let whereClause = {};
      if (payment_method) whereClause.payment_method = payment_method;
      if (employee_id) whereClause.processed_by = employee_id;

      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        whereClause.payment_date = {
          [Op.between]: [startDate, endDate],
        };
      }

      const payments = await Payment.findAll({
        where: whereClause,
        include: [
          {
            model: Order,
            as: "order",
            attributes: [
              "order_id",
              "table_id",
              "total_amount",
              "final_amount",
              "status",
            ],
          },
          {
            model: Employee,
            as: "cashier",
            attributes: ["employee_id", "employee_name", "role"],
          },
        ],
        order: [["payment_date", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE PAYMENT ====================
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await Payment.findByPk(id, {
        include: [
          {
            model: Order,
            as: "order",
          },
          {
            model: Employee,
            as: "cashier",
          },
        ],
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
        error: error.message,
      });
    }
  },

  // ==================== CREATE PAYMENT (PROCESS PAYMENT) ====================
  async createPayment(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        order_id,
        payment_method,
        amount_paid,
        processed_by,
        transaction_id,
        notes,
      } = req.body;

      // Validate required fields
      if (!order_id || !payment_method || !amount_paid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Order ID, payment method, and amount paid are required",
        });
      }

      // Check if order exists
      const order = await Order.findByPk(order_id);

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if order is already paid
      const existingPayment = await Payment.findOne({ where: { order_id } });

      if (existingPayment) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Order has already been paid",
        });
      }

      // Check if amount is sufficient
      const amountPaidFloat = parseFloat(amount_paid);
      const finalAmount = parseFloat(order.final_amount);

      if (amountPaidFloat < finalAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient payment. Required: ${finalAmount}, Paid: ${amountPaidFloat}`,
        });
      }

      // Calculate change
      const changeGiven = amountPaidFloat - finalAmount;

      // Create payment
      const payment = await Payment.create(
        {
          order_id,
          payment_method,
          amount_paid: amountPaidFloat,
          change_given: changeGiven,
          processed_by: processed_by || null,
          transaction_id: transaction_id || null,
          notes: notes || null,
        },
        { transaction }
      );

      // Update order status to completed
      await order.update({ status: "completed" }, { transaction });

      // Free the table
      const Table = require("../models").Table;
      const table = await Table.findByPk(order.table_id);
      if (table) {
        await table.update({ status: "free" }, { transaction });
      }

      await transaction.commit();

      // Fetch complete payment with relations
      const createdPayment = await Payment.findByPk(payment.payment_id, {
        include: [
          {
            model: Order,
            as: "order",
          },
          {
            model: Employee,
            as: "cashier",
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Payment processed successfully",
        data: createdPayment,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating payment:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to process payment",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE PAYMENT ====================
  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { notes, transaction_id } = req.body;

      const payment = await Payment.findByPk(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      await payment.update({
        notes: notes !== undefined ? notes : payment.notes,
        transaction_id:
          transaction_id !== undefined
            ? transaction_id
            : payment.transaction_id,
      });

      res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment",
        error: error.message,
      });
    }
  },

  // ==================== DELETE PAYMENT ====================
  async deletePayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await Payment.findByPk(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      await payment.destroy();

      res.status(200).json({
        success: true,
        message: "Payment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete payment",
        error: error.message,
      });
    }
  },

  // ==================== GET PAYMENTS BY METHOD ====================
  async getPaymentsByMethod(req, res) {
    try {
      const { method } = req.params;

      const validMethods = ["cash", "card", "mobile_payment", "other"];

      if (!validMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Must be one of: ${validMethods.join(
            ", "
          )}`,
        });
      }

      const payments = await Payment.findAll({
        where: { payment_method: method },
        include: [
          {
            model: Order,
            as: "order",
            attributes: ["order_id", "final_amount", "order_date"],
          },
        ],
        order: [["payment_date", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching payments by method:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  },

  // ==================== GET PAYMENT BY RECEIPT NUMBER ====================
  async getPaymentByReceiptNumber(req, res) {
    try {
      const { receipt_number } = req.params;

      const payment = await Payment.findOne({
        where: { receipt_number },
        include: [
          {
            model: Order,
            as: "order",
          },
          {
            model: Employee,
            as: "cashier",
          },
        ],
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found with this receipt number",
        });
      }

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error fetching payment by receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
        error: error.message,
      });
    }
  },

  // ==================== GET DAILY PAYMENTS ====================
  async getDailyPayments(req, res) {
    try {
      const { date } = req.query;

      let startDate, endDate;

      if (date) {
        startDate = new Date(date);
        endDate = new Date(date);
      } else {
        startDate = new Date();
        endDate = new Date();
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const payments = await Payment.findAll({
        where: {
          payment_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: Order,
            as: "order",
            attributes: ["order_id", "final_amount"],
          },
          {
            model: Employee,
            as: "cashier",
            attributes: ["employee_name"],
          },
        ],
        order: [["payment_date", "DESC"]],
      });

      // Calculate totals
      const totalAmount = payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount_paid),
        0
      );

      const totalByMethod = payments.reduce((acc, payment) => {
        const method = payment.payment_method;
        acc[method] = (acc[method] || 0) + parseFloat(payment.amount_paid);
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        date: date || new Date().toISOString().split("T")[0],
        count: payments.length,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        by_method: totalByMethod,
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching daily payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch daily payments",
        error: error.message,
      });
    }
  },

  // ==================== GET PAYMENT STATISTICS ====================
  async getPaymentStatistics(req, res) {
    try {
      const totalPayments = await Payment.count();

      const totalRevenue = await Payment.sum("amount_paid");

      // By payment method
      const paymentsByMethod = await Payment.findAll({
        attributes: [
          "payment_method",
          [sequelize.fn("COUNT", sequelize.col("payment_id")), "count"],
          [sequelize.fn("SUM", sequelize.col("amount_paid")), "total"],
        ],
        group: ["payment_method"],
      });

      // Today's payments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = await Payment.count({
        where: {
          payment_date: { [Op.gte]: today },
        },
      });

      const todayRevenue = await Payment.sum("amount_paid", {
        where: {
          payment_date: { [Op.gte]: today },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          total_payments: totalPayments,
          total_revenue: parseFloat(totalRevenue || 0).toFixed(2),
          today_payments: todayPayments,
          today_revenue: parseFloat(todayRevenue || 0).toFixed(2),
          by_method: paymentsByMethod,
        },
      });
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment statistics",
        error: error.message,
      });
    }
  },

  // ==================== PRINT RECEIPT ====================
  async printReceipt(req, res) {
    try {
      const { id } = req.params;

      const payment = await Payment.findByPk(id, {
        include: [
          {
            model: Order,
            as: "order",
            include: [
              {
                model: require("../models").OrderItem,
                as: "items",
                include: [
                  {
                    model: require("../models").Product,
                    as: "product",
                    attributes: ["product_name", "price"],
                  },
                ],
              },
              {
                model: require("../models").Table,
                as: "table",
                attributes: ["table_number"],
              },
            ],
          },
          {
            model: Employee,
            as: "cashier",
            attributes: ["employee_name"],
          },
        ],
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Format receipt data
      const receiptData = {
        receipt_number: payment.receipt_number,
        order_id: payment.order.order_id,
        table: payment.order.table.table_number,
        date: payment.payment_date,
        cashier: payment.cashier
          ? payment.cashier.employee_name
          : "Not specified",
        items: payment.order.items.map((item) => ({
          name: item.product.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price).toFixed(2),
          subtotal: parseFloat(item.subtotal).toFixed(2),
        })),
        subtotal: parseFloat(payment.order.total_amount).toFixed(2),
        discount: parseFloat(payment.order.discount).toFixed(2),
        tax: parseFloat(payment.order.tax).toFixed(2),
        total: parseFloat(payment.order.final_amount).toFixed(2),
        payment_method: payment.payment_method,
        amount_paid: parseFloat(payment.amount_paid).toFixed(2),
        change: parseFloat(payment.change_given).toFixed(2),
      };

      res.status(200).json({
        success: true,
        data: receiptData,
      });
    } catch (error) {
      console.error("Error printing receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to print receipt",
        error: error.message,
      });
    }
  },
};

module.exports = paymentController;
