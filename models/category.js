"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.hasMany(models.Product, {
        foreignKey: "category_id",
        as: "products",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }

    // Instance method to activate category
    async activate() {
      await this.update({ is_active: true });
    }

    // Instance method to deactivate category
    async deactivate() {
      await this.update({ is_active: false });
    }
  }

  Category.init(
    {
      category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
          msg: "Category name must be unique",
        },
        validate: {
          notEmpty: {
            msg: "Category name cannot be empty",
          },
        },
      },
      type: {
        type: DataTypes.ENUM("meal", "drink", "dessert", "appetizer"),
        allowNull: false,
        defaultValue: "meal",
        validate: {
          isIn: {
            args: [["meal", "drink", "dessert", "appetizer"]],
            msg: "Type must be meal, drink, dessert, or appetizer",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories",
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ["type"] }, { fields: ["is_active"] }],
    }
  );

  return Category;
};
