"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // Employee has many Orders (as waiter)
      Employee.hasMany(models.Order, {
        foreignKey: "employee_id",
        as: "orders",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      // Employee has many Payments (as cashier)
      Employee.hasMany(models.Payment, {
        foreignKey: "processed_by",
        as: "processed_payments",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      // Employee has many InventoryLogs
      Employee.hasMany(models.InventoryLog, {
        foreignKey: "performed_by",
        as: "inventory_actions",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    // Get full name
    get fullName() {
      return this.employee_name;
    }

    // Check if employee is active
    isActive() {
      return this.is_active === true;
    }

    // Activate employee
    async activate() {
      await this.update({ is_active: true });
    }

    // Deactivate employee
    async deactivate() {
      await this.update({ is_active: false });
    }

    // Calculate years of service
    getYearsOfService() {
      const today = new Date();
      const hireDate = new Date(this.hire_date);
      const years = (today - hireDate) / (1000 * 60 * 60 * 24 * 365);
      return Math.floor(years);
    }
  }

  Employee.init(
    {
      employee_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Employee name cannot be empty",
          },
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: {
          msg: "Email must be unique",
        },
        validate: {
          isEmail: {
            msg: "Must be a valid email address",
          },
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("waiter", "chef", "cashier", "manager"),
        allowNull: false,
        defaultValue: "waiter",
        validate: {
          isIn: {
            args: [["waiter", "chef", "cashier", "manager"]],
            msg: "Role must be waiter, chef, cashier, or manager",
          },
        },
      },
      salary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: {
            args: [0],
            msg: "Salary must be positive",
          },
        },
      },
      hire_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Employee",
      tableName: "employees",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["role"] },
        { fields: ["is_active"] },
        { fields: ["email"], unique: true },
      ],
    }
  );

  return Employee;
};
