"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tables", {
      table_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      table_number: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 4,
      },
      status: {
        type: Sequelize.ENUM("free", "occupied", "reserved"),
        allowNull: false,
        defaultValue: "free",
      },
      location: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "e.g., Indoor, Outdoor, VIP",
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
    await queryInterface.addIndex("tables", ["status"], {
      name: "tables_status_idx",
    });

    await queryInterface.addIndex("tables", ["table_number"], {
      unique: true,
      name: "tables_number_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("tables");
  },
};
