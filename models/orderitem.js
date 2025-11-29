"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      // OrderItem belongs to Order
      OrderItem.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // OrderItem belongs to Product
      OrderItem.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }

    // Calculate subtotal
    calculateSubtotal() {
      return parseFloat(
        (this.quantity * parseFloat(this.unit_price)).toFixed(2)
      );
    }

    // Update item status
    async updateStatus(newStatus) {
      const validStatuses = ["pending", "preparing", "ready", "served"];
      if (!validStatuses.includes(newStatus)) {
        throw new Error("Invalid order item status");
      }
      await this.update({ status: newStatus });
    }
  }

  OrderItem.init(
    {
      order_item_id: {
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
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Product ID is required",
          },
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: "Quantity must be at least 1",
          },
        },
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Unit price must be positive",
          },
        },
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Subtotal must be positive",
          },
        },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "preparing", "ready", "served"),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: {
            args: [["pending", "preparing", "ready", "served"]],
            msg: "Invalid status",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "OrderItem",
      tableName: "order_items",
      underscored: true,
      timestamps: true,
      hooks: {
        beforeSave: (orderItem) => {
          // Auto-calculate subtotal
          orderItem.subtotal = orderItem.calculateSubtotal();
        },
      },
      indexes: [
        { fields: ["order_id"] },
        { fields: ["product_id"] },
        { fields: ["status"] },
      ],
    }
  );

  return OrderItem;
};
