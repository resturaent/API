const { Table, Order } = require("../models");
const { Op } = require("sequelize");

const tableController = {
  // ==================== GET ALL TABLES ====================
  async getAllTables(req, res) {
    try {
      const { status, location } = req.query;
      const whereClause = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by location
      if (location) {
        whereClause.location = { [Op.like]: `%${location}%` };
      }

      const tables = await Table.findAll({
        where: whereClause,
        order: [["table_number", "ASC"]],
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });

      res.status(200).json({
        success: true,
        count: tables.length,
        data: tables,
      });
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tables",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE TABLE ====================
  async getTableById(req, res) {
    try {
      const { id } = req.params;

      const table = await Table.findByPk(id, {
        include: [
          {
            model: Order,
            as: "orders",
            where: { status: { [Op.notIn]: ["completed", "cancelled"] } },
            required: false,
            attributes: [
              "order_id",
              "customer_name",
              "total_amount",
              "status",
              "order_date",
            ],
          },
        ],
      });

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      res.status(200).json({
        success: true,
        data: table,
      });
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch table",
        error: error.message,
      });
    }
  },

  // ==================== CREATE TABLE ====================
  async createTable(req, res) {
    try {
      const { table_number, capacity, location, status } = req.body;

      // Validate required fields
      if (!table_number) {
        return res.status(400).json({
          success: false,
          message: "Table number is required",
        });
      }

      // Check if table number already exists
      const existingTable = await Table.findOne({
        where: { table_number },
      });

      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: "Table number already exists",
        });
      }

      const table = await Table.create({
        table_number,
        capacity: capacity || 4,
        location,
        status: status || "free",
      });

      res.status(201).json({
        success: true,
        message: "Table created successfully",
        data: table,
      });
    } catch (error) {
      console.error("Error creating table:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create table",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE TABLE ====================
  async updateTable(req, res) {
    try {
      const { id } = req.params;
      const { table_number, capacity, location, status } = req.body;

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      // Check if new table number already exists
      if (table_number && table_number !== table.table_number) {
        const existingTable = await Table.findOne({
          where: { table_number },
        });

        if (existingTable) {
          return res.status(400).json({
            success: false,
            message: "Table number already exists",
          });
        }
      }

      await table.update({
        table_number: table_number || table.table_number,
        capacity: capacity !== undefined ? capacity : table.capacity,
        location: location !== undefined ? location : table.location,
        status: status || table.status,
      });

      res.status(200).json({
        success: true,
        message: "Table updated successfully",
        data: table,
      });
    } catch (error) {
      console.error("Error updating table:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update table",
        error: error.message,
      });
    }
  },

  // ==================== DELETE TABLE ====================
  async deleteTable(req, res) {
    try {
      const { id } = req.params;

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      // Check if table has active orders
      const activeOrders = await Order.count({
        where: {
          table_id: id,
          status: { [Op.notIn]: ["completed", "cancelled"] },
        },
      });

      if (activeOrders > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete table with active orders",
        });
      }

      await table.destroy();

      res.status(200).json({
        success: true,
        message: "Table deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting table:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete table",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE TABLE STATUS ====================
  async updateTableStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["free", "occupied", "reserved"];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status is required (free, occupied, reserved)",
        });
      }

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      await table.update({ status });

      res.status(200).json({
        success: true,
        message: `Table status updated to ${status}`,
        data: table,
      });
    } catch (error) {
      console.error("Error updating table status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update table status",
        error: error.message,
      });
    }
  },

  // ==================== OCCUPY TABLE ====================
  async occupyTable(req, res) {
    try {
      const { id } = req.params;

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      if (table.status !== "free") {
        return res.status(400).json({
          success: false,
          message: `Table is currently ${table.status}`,
        });
      }

      const success = await table.occupy();

      if (success) {
        res.status(200).json({
          success: true,
          message: "Table occupied successfully",
          data: table,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to occupy table",
        });
      }
    } catch (error) {
      console.error("Error occupying table:", error);
      res.status(500).json({
        success: false,
        message: "Failed to occupy table",
        error: error.message,
      });
    }
  },

  // ==================== FREE TABLE ====================
  async freeTable(req, res) {
    try {
      const { id } = req.params;

      const table = await Table.findByPk(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      // Check if table has active orders
      const activeOrders = await Order.count({
        where: {
          table_id: id,
          status: { [Op.notIn]: ["completed", "cancelled"] },
        },
      });

      if (activeOrders > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot free table with active orders. Please complete or cancel orders first.",
        });
      }

      await table.free();

      res.status(200).json({
        success: true,
        message: "Table freed successfully",
        data: table,
      });
    } catch (error) {
      console.error("Error freeing table:", error);
      res.status(500).json({
        success: false,
        message: "Failed to free table",
        error: error.message,
      });
    }
  },

  // ==================== GET AVAILABLE TABLES ====================
  async getAvailableTables(req, res) {
    try {
      const { capacity } = req.query;
      const whereClause = { status: "free" };

      // Filter by minimum capacity
      if (capacity) {
        whereClause.capacity = { [Op.gte]: parseInt(capacity) };
      }

      const tables = await Table.findAll({
        where: whereClause,
        order: [["table_number", "ASC"]],
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });

      res.status(200).json({
        success: true,
        count: tables.length,
        data: tables,
      });
    } catch (error) {
      console.error("Error fetching available tables:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch available tables",
        error: error.message,
      });
    }
  },

  // ==================== GET TABLE STATISTICS ====================
  async getTableStatistics(req, res) {
    try {
      const totalTables = await Table.count();
      const freeTables = await Table.count({ where: { status: "free" } });
      const occupiedTables = await Table.count({
        where: { status: "occupied" },
      });
      const reservedTables = await Table.count({
        where: { status: "reserved" },
      });

      // Get tables by location
      const tablesByLocation = await Table.findAll({
        attributes: [
          "location",
          [
            Table.sequelize.fn("COUNT", Table.sequelize.col("table_id")),
            "count",
          ],
        ],
        group: ["location"],
      });

      res.status(200).json({
        success: true,
        data: {
          total: totalTables,
          free: freeTables,
          occupied: occupiedTables,
          reserved: reservedTables,
          occupancy_rate:
            totalTables > 0
              ? ((occupiedTables / totalTables) * 100).toFixed(2)
              : 0,
          by_location: tablesByLocation,
        },
      });
    } catch (error) {
      console.error("Error fetching table statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch table statistics",
        error: error.message,
      });
    }
  },
};

module.exports = tableController;
