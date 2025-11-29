"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("orders", {
      order_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      table_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "tables",
          key: "table_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "employees",
          key: "employee_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Waiter who took the order",
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      order_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      final_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM(
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
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("orders", ["table_id"], {
      name: "orders_table_idx",
    });

    await queryInterface.addIndex("orders", ["employee_id"], {
      name: "orders_employee_idx",
    });

    await queryInterface.addIndex("orders", ["status"], {
      name: "orders_status_idx",
    });

    await queryInterface.addIndex("orders", ["order_date"], {
      name: "orders_date_idx",
    });

    // Add check constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE orders ADD CONSTRAINT orders_total_check CHECK (total_amount >= 0);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE orders ADD CONSTRAINT orders_discount_check CHECK (discount >= 0);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("orders");
  },
};
