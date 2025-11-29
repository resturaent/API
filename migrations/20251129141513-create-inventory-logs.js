"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("inventory_logs", {
      log_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      change_type: {
        type: Sequelize.ENUM("restock", "sale", "wastage", "adjustment"),
        allowNull: false,
      },
      quantity_change: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Positive for additions, negative for reductions",
      },
      quantity_before: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity_after: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "employees",
          key: "employee_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "orders",
          key: "order_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "If change was due to an order",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("inventory_logs", ["product_id"], {
      name: "inventory_logs_product_idx",
    });

    await queryInterface.addIndex("inventory_logs", ["change_type"], {
      name: "inventory_logs_type_idx",
    });

    await queryInterface.addIndex("inventory_logs", ["created_at"], {
      name: "inventory_logs_date_idx",
    });

    await queryInterface.addIndex("inventory_logs", ["performed_by"], {
      name: "inventory_logs_employee_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("inventory_logs");
  },
};
