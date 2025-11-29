"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Product belongs to Category
      Product.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "category",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });

      // Product has many OrderItems
      Product.hasMany(models.OrderItem, {
        foreignKey: "product_id",
        as: "order_items",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });

      // Product has many InventoryLogs
      Product.hasMany(models.InventoryLog, {
        foreignKey: "product_id",
        as: "inventory_logs",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }

    // Check if product is low on stock
    isLowStock() {
      return this.quantity_in_stock <= this.reorder_level;
    }

    // Check if product is out of stock
    isOutOfStock() {
      return this.quantity_in_stock === 0;
    }

    // Calculate profit margin
    getProfitMargin() {
      if (!this.cost_price || this.cost_price === 0) return 0;
      return (((this.price - this.cost_price) / this.cost_price) * 100).toFixed(
        2
      );
    }

    // Update stock quantity
    async updateStock(
      quantity,
      changeType = "adjustment",
      reason = null,
      employeeId = null,
      orderId = null
    ) {
      const quantityBefore = this.quantity_in_stock;
      const quantityAfter = quantityBefore + quantity;

      if (quantityAfter < 0) {
        throw new Error("Insufficient stock");
      }

      await this.update({ quantity_in_stock: quantityAfter });

      // Create inventory log
      await sequelize.models.InventoryLog.create({
        product_id: this.product_id,
        change_type: changeType,
        quantity_change: quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        reason: reason,
        performed_by: employeeId,
        order_id: orderId,
      });

      return this;
    }

    // Mark as available/unavailable
    async setAvailability(available) {
      await this.update({ is_available: available });
    }
  }

  Product.init(
    {
      product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Product name cannot be empty",
          },
        },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Category is required",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Price must be positive",
          },
        },
      },
      cost_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: {
            args: [0],
            msg: "Cost price must be positive",
          },
        },
      },
      quantity_in_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Stock quantity cannot be negative",
          },
        },
      },
      reorder_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: {
            args: [0],
            msg: "Reorder level must be non-negative",
          },
        },
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Product",
      tableName: "products",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["category_id"] },
        { fields: ["is_available"] },
        { fields: ["product_name"] },
      ],
    }
  );

  return Product;
};
