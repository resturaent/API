"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Payment belongs to Order
      Payment.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });

      // Payment belongs to Employee (cashier)
      Payment.belongsTo(models.Employee, {
        foreignKey: "processed_by",
        as: "cashier",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    // Calculate change
    calculateChange(orderAmount) {
      const change = parseFloat(this.amount_paid) - parseFloat(orderAmount);
      return parseFloat(Math.max(0, change).toFixed(2));
    }

    // Generate receipt number
    static generateReceiptNumber() {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      return `RCP-${timestamp}-${random}`;
    }

    // Check if payment is sufficient
    isSufficient(orderAmount) {
      return parseFloat(this.amount_paid) >= parseFloat(orderAmount);
    }
  }

  Payment.init(
    {
      payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Order ID is required",
          },
        },
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "card", "mobile_payment", "other"),
        allowNull: false,
        defaultValue: "cash",
        validate: {
          isIn: {
            args: [["cash", "card", "mobile_payment", "other"]],
            msg: "Invalid payment method",
          },
        },
      },
      amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Amount paid must be positive",
          },
        },
      },
      change_given: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Change cannot be negative",
          },
        },
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      processed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      receipt_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: {
          msg: "Receipt number must be unique",
        },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      underscored: true,
      timestamps: true,
      hooks: {
        beforeCreate: (payment) => {
          // Auto-generate receipt number if not provided
          if (!payment.receipt_number) {
            payment.receipt_number = Payment.generateReceiptNumber();
          }
        },
      },
      indexes: [
        { fields: ["order_id"] },
        { fields: ["payment_method"] },
        { fields: ["payment_date"] },
        { fields: ["processed_by"] },
        { fields: ["receipt_number"], unique: true },
      ],
    }
  );

  return Payment;
};
