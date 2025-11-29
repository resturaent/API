"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Order belongs to Table
      Order.belongsTo(models.Table, {
        foreignKey: "table_id",
        as: "table",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });

      // Order belongs to Employee (waiter)
      Order.belongsTo(models.Employee, {
        foreignKey: "employee_id",
        as: "waiter",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      // Order has many OrderItems
      Order.hasMany(models.OrderItem, {
        foreignKey: "order_id",
        as: "items",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Order has one Payment
      Order.hasOne(models.Payment, {
        foreignKey: "order_id",
        as: "payment",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });

      // Order has many InventoryLogs
      Order.hasMany(models.InventoryLog, {
        foreignKey: "order_id",
        as: "inventory_logs",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    // Calculate final amount with discount and tax
    calculateFinalAmount() {
      const afterDiscount =
        parseFloat(this.total_amount) - parseFloat(this.discount);
      const finalAmount = afterDiscount + parseFloat(this.tax);
      return parseFloat(finalAmount.toFixed(2));
    }

    // Update order status
    async updateStatus(newStatus) {
      const validStatuses = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(newStatus)) {
        throw new Error("Invalid order status");
      }
      await this.update({ status: newStatus });
    }

    // Check if order can be modified
    canBeModified() {
      return ["pending", "confirmed"].includes(this.status);
    }

    // Check if order is completed
    isCompleted() {
      return this.status === "completed";
    }

    // Check if order is cancelled
    isCancelled() {
      return this.status === "cancelled";
    }
  }

  Order.init(
    {
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      table_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Table is required",
          },
        },
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      customer_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      order_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Total amount must be positive",
          },
        },
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Discount cannot be negative",
          },
        },
      },
      tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Tax cannot be negative",
          },
        },
      },
      final_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Final amount must be positive",
          },
        },
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "served",
          "completed",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: {
            args: [
              [
                "pending",
                "confirmed",
                "preparing",
                "ready",
                "served",
                "completed",
                "cancelled",
              ],
            ],
            msg: "Invalid status",
          },
        },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Order",
      tableName: "orders",
      underscored: true,
      timestamps: true,
      hooks: {
        beforeSave: (order) => {
          // Auto-calculate final amount
          order.final_amount = order.calculateFinalAmount();
        },
      },
      indexes: [
        { fields: ["table_id"] },
        { fields: ["employee_id"] },
        { fields: ["status"] },
        { fields: ["order_date"] },
      ],
    }
  );

  return Order;
};
