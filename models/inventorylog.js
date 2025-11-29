"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class InventoryLog extends Model {
    static associate(models) {
      // InventoryLog belongs to Product
      InventoryLog.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // InventoryLog belongs to Employee
      InventoryLog.belongsTo(models.Employee, {
        foreignKey: "performed_by",
        as: "employee",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      // InventoryLog belongs to Order
      InventoryLog.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    // Check if this was a stock increase
    isIncrease() {
      return this.quantity_change > 0;
    }

    // Check if this was a stock decrease
    isDecrease() {
      return this.quantity_change < 0;
    }

    // Get absolute quantity change
    getAbsoluteChange() {
      return Math.abs(this.quantity_change);
    }
  }

  InventoryLog.init(
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Product ID is required",
          },
        },
      },
      change_type: {
        type: DataTypes.ENUM("restock", "sale", "wastage", "adjustment"),
        allowNull: false,
        validate: {
          isIn: {
            args: [["restock", "sale", "wastage", "adjustment"]],
            msg: "Invalid change type",
          },
        },
      },
      quantity_change: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notZero(value) {
            if (value === 0) {
              throw new Error("Quantity change cannot be zero");
            }
          },
        },
      },
      quantity_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Quantity before cannot be negative",
          },
        },
      },
      quantity_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Quantity after cannot be negative",
          },
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      performed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "InventoryLog",
      tableName: "inventory_logs",
      underscored: true,
      timestamps: false,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["product_id"] },
        { fields: ["change_type"] },
        { fields: ["created_at"] },
        { fields: ["performed_by"] },
      ],
    }
  );

  return InventoryLog;
};
