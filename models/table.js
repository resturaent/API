"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      // Table has many Orders
      Table.hasMany(models.Order, {
        foreignKey: "table_id",
        as: "orders",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }

    // Instance method to check if table is available
    isAvailable() {
      return this.status === "free";
    }

    // Instance method to occupy table
    async occupy() {
      if (this.status === "free") {
        await this.update({ status: "occupied" });
        return true;
      }
      return false;
    }

    // Instance method to free table
    async free() {
      await this.update({ status: "free" });
    }
  }

  Table.init(
    {
      table_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      table_number: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: {
          msg: "Table number must be unique",
        },
        validate: {
          notEmpty: {
            msg: "Table number cannot be empty",
          },
        },
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4,
        validate: {
          min: {
            args: [1],
            msg: "Capacity must be at least 1",
          },
        },
      },
      status: {
        type: DataTypes.ENUM("free", "occupied", "reserved"),
        allowNull: false,
        defaultValue: "free",
        validate: {
          isIn: {
            args: [["free", "occupied", "reserved"]],
            msg: "Status must be free, occupied, or reserved",
          },
        },
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Table",
      tableName: "tables",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["table_number"], unique: true },
      ],
    }
  );

  return Table;
};
