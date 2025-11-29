const {
  InventoryLog,
  Product,
  Employee,
  Order,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

const inventoryController = {
  // ==================== GET ALL INVENTORY LOGS ====================
  async getAllInventoryLogs(req, res) {
    try {
      const { product_id, change_type, employee_id, start_date, end_date } =
        req.query;

      let whereClause = {};
      if (product_id) whereClause.product_id = product_id;
      if (change_type) whereClause.change_type = change_type;
      if (employee_id) whereClause.performed_by = employee_id;

      if (start_date && end_date) {
        whereClause.created_at = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      }

      const logs = await InventoryLog.findAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["product_id", "product_name", "quantity_in_stock"],
          },
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_id", "employee_name", "role"],
          },
          {
            model: Order,
            as: "order",
            attributes: ["order_id", "status"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 100,
      });

      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (error) {
      console.error("Error fetching inventory logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch inventory logs",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE INVENTORY LOG ====================
  async getInventoryLogById(req, res) {
    try {
      const { id } = req.params;

      const log = await InventoryLog.findByPk(id, {
        include: [
          {
            model: Product,
            as: "product",
          },
          {
            model: Employee,
            as: "employee",
          },
          {
            model: Order,
            as: "order",
          },
        ],
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          message: "Inventory log not found",
        });
      }

      res.status(200).json({
        success: true,
        data: log,
      });
    } catch (error) {
      console.error("Error fetching inventory log:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch inventory log",
        error: error.message,
      });
    }
  },

  // ==================== GET LOGS BY PRODUCT ====================
  async getLogsByProduct(req, res) {
    try {
      const { product_id } = req.params;

      const product = await Product.findByPk(product_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const logs = await InventoryLog.findAll({
        where: { product_id },
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_name"],
          },
          {
            model: Order,
            as: "order",
            attributes: ["order_id"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 50,
      });

      res.status(200).json({
        success: true,
        product: {
          id: product.product_id,
          name: product.product_name,
          current_stock: product.quantity_in_stock,
        },
        count: logs.length,
        data: logs,
      });
    } catch (error) {
      console.error("Error fetching logs by product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch logs",
        error: error.message,
      });
    }
  },

  // ==================== GET LOGS BY CHANGE TYPE ====================
  async getLogsByChangeType(req, res) {
    try {
      const { type } = req.params;

      const validTypes = ["restock", "sale", "wastage", "adjustment"];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid change type. Must be one of: ${validTypes.join(
            ", "
          )}`,
        });
      }

      const logs = await InventoryLog.findAll({
        where: { change_type: type },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["product_name"],
          },
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_name"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 100,
      });

      res.status(200).json({
        success: true,
        type,
        count: logs.length,
        data: logs,
      });
    } catch (error) {
      console.error("Error fetching logs by type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch logs",
        error: error.message,
      });
    }
  },

  // ==================== GET RECENT WASTAGE ====================
  async getRecentWastage(req, res) {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const wastageLogs = await InventoryLog.findAll({
        where: {
          change_type: "wastage",
          created_at: {
            [Op.gte]: startDate,
          },
        },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["product_name", "price"],
          },
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // Calculate total wastage value
      const totalWastageValue = wastageLogs.reduce((sum, log) => {
        const quantity = Math.abs(log.quantity_change);
        const price = parseFloat(log.product.price);
        return sum + quantity * price;
      }, 0);

      res.status(200).json({
        success: true,
        period_days: parseInt(days),
        count: wastageLogs.length,
        total_wastage_value: parseFloat(totalWastageValue.toFixed(2)),
        data: wastageLogs,
      });
    } catch (error) {
      console.error("Error fetching wastage logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wastage logs",
        error: error.message,
      });
    }
  },

  // ==================== GET RESTOCK HISTORY ====================
  async getRestockHistory(req, res) {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const restockLogs = await InventoryLog.findAll({
        where: {
          change_type: "restock",
          created_at: {
            [Op.gte]: startDate,
          },
        },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["product_name", "cost_price"],
          },
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // Calculate total restock value
      const totalRestockValue = restockLogs.reduce((sum, log) => {
        const quantity = log.quantity_change;
        const costPrice = parseFloat(log.product.cost_price || 0);
        return sum + quantity * costPrice;
      }, 0);

      res.status(200).json({
        success: true,
        period_days: parseInt(days),
        count: restockLogs.length,
        total_restock_value: parseFloat(totalRestockValue.toFixed(2)),
        data: restockLogs,
      });
    } catch (error) {
      console.error("Error fetching restock history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch restock history",
        error: error.message,
      });
    }
  },

  // ==================== GET INVENTORY STATISTICS ====================
  async getInventoryStatistics(req, res) {
    try {
      const totalLogs = await InventoryLog.count();

      // Logs by type
      const logsByType = await InventoryLog.findAll({
        attributes: [
          "change_type",
          [sequelize.fn("COUNT", sequelize.col("log_id")), "count"],
        ],
        group: ["change_type"],
      });

      // Today's activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLogs = await InventoryLog.count({
        where: {
          created_at: { [Op.gte]: today },
        },
      });

      // Recent wastage count (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentWastage = await InventoryLog.count({
        where: {
          change_type: "wastage",
          created_at: { [Op.gte]: weekAgo },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          total_logs: totalLogs,
          today_activity: todayLogs,
          recent_wastage_7days: recentWastage,
          by_type: logsByType,
        },
      });
    } catch (error) {
      console.error("Error fetching inventory statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch inventory statistics",
        error: error.message,
      });
    }
  },

  // ==================== GET LOW STOCK ALERTS ====================
  async getLowStockAlerts(req, res) {
    try {
      const lowStockProducts = await Product.findAll({
        where: sequelize.where(
          sequelize.col("quantity_in_stock"),
          Op.lte,
          sequelize.col("reorder_level")
        ),
        include: [
          {
            model: require("../models").Category,
            as: "category",
            attributes: ["category_name", "type"],
          },
        ],
        order: [["quantity_in_stock", "ASC"]],
      });

      const alerts = lowStockProducts.map((product) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        category: product.category.category_name,
        current_stock: product.quantity_in_stock,
        reorder_level: product.reorder_level,
        shortage: product.reorder_level - product.quantity_in_stock,
        status: product.quantity_in_stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        is_available: product.is_available,
      }));

      res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    } catch (error) {
      console.error("Error fetching low stock alerts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch low stock alerts",
        error: error.message,
      });
    }
  },
};

module.exports = inventoryController;
