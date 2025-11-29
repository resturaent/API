"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("products", {
      product_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "categories",
          key: "category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Cost to make/buy the product",
      },
      quantity_in_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reorder_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: "Trigger low stock alert at this level",
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: "e.g., pieces, kg, liters",
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      image_url: {
        type: Sequelize.STRING(255),
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
    await queryInterface.addIndex("products", ["category_id"], {
      name: "products_category_idx",
    });

    await queryInterface.addIndex("products", ["is_available"], {
      name: "products_available_idx",
    });

    await queryInterface.addIndex("products", ["product_name"], {
      name: "products_name_idx",
    });

    // Add check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE products ADD CONSTRAINT products_quantity_check CHECK (quantity_in_stock >= 0);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("products");
  },
};
