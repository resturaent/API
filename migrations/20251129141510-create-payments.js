"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "order_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      payment_method: {
        type: Sequelize.ENUM("cash", "card", "mobile_payment", "other"),
        allowNull: false,
        defaultValue: "cash",
      },
      amount_paid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      change_given: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      processed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "employees",
          key: "employee_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Cashier who processed the payment",
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "For card/mobile payments",
      },
      receipt_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
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
    await queryInterface.addIndex("payments", ["order_id"], {
      name: "payments_order_idx",
    });

    await queryInterface.addIndex("payments", ["payment_method"], {
      name: "payments_method_idx",
    });

    await queryInterface.addIndex("payments", ["payment_date"], {
      name: "payments_date_idx",
    });

    await queryInterface.addIndex("payments", ["processed_by"], {
      name: "payments_processor_idx",
    });

    await queryInterface.addIndex("payments", ["receipt_number"], {
      unique: true,
      name: "payments_receipt_unique",
    });

    // Add check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount_paid >= 0);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("payments");
  },
};
