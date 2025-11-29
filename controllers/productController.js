const { Product, Category, OrderItem, InventoryLog } = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../models");

const productController = {
  // ==================== GET ALL PRODUCTS ====================
  async getAllProducts(req, res) {
    try {
      const {
        category_id,
        is_available,
        search,
        low_stock,
        min_price,
        max_price,
        sort_by,
        order,
      } = req.query;

      const whereClause = {};

      // Filter by category
      if (category_id) {
        whereClause.category_id = category_id;
      }

      // Filter by availability
      if (is_available !== undefined) {
        whereClause.is_available = is_available === "true";
      }

      // Search by product name
      if (search) {
        whereClause.product_name = { [Op.like]: `%${search}%` };
      }

      // Filter by price range
      if (min_price || max_price) {
        whereClause.price = {};
        if (min_price) whereClause.price[Op.gte] = parseFloat(min_price);
        if (max_price) whereClause.price[Op.lte] = parseFloat(max_price);
      }

      // Filter low stock items
      if (low_stock === "true") {
        whereClause[Op.and] = sequelize.where(
          sequelize.col("quantity_in_stock"),
          Op.lte,
          sequelize.col("reorder_level")
        );
      }

      // Sorting
      let orderClause = [["product_name", "ASC"]];
      if (sort_by) {
        const sortOrder = order === "desc" ? "DESC" : "ASC";
        orderClause = [[sort_by, sortOrder]];
      }

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_id", "category_name", "type"],
          },
        ],
        order: orderClause,
      });

      res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE PRODUCT ====================
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_id", "category_name", "type", "description"],
          },
          {
            model: InventoryLog,
            as: "inventory_logs",
            limit: 10,
            order: [["created_at", "DESC"]],
            attributes: [
              "log_id",
              "change_type",
              "quantity_change",
              "quantity_before",
              "quantity_after",
              "reason",
              "created_at",
            ],
          },
        ],
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Add additional info
      const productData = product.toJSON();
      productData.is_low_stock = product.isLowStock();
      productData.is_out_of_stock = product.isOutOfStock();
      productData.profit_margin = product.getProfitMargin();

      res.status(200).json({
        success: true,
        data: productData,
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
        error: error.message,
      });
    }
  },

  // ==================== CREATE PRODUCT ====================
  async createProduct(req, res) {
    try {
      const {
        product_name,
        category_id,
        description,
        price,
        cost_price,
        quantity_in_stock,
        reorder_level,
        unit,
        is_available,
        image_url,
      } = req.body;

      // Validate required fields
      if (!product_name || !category_id || !price) {
        return res.status(400).json({
          success: false,
          message: "Product name, category, and price are required",
        });
      }

      // Check if category exists
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const product = await Product.create({
        product_name: product_name.trim(),
        category_id,
        description,
        price,
        cost_price,
        quantity_in_stock: quantity_in_stock || 0,
        reorder_level: reorder_level || 10,
        unit,
        is_available: is_available !== undefined ? is_available : true,
        image_url,
      });

      // Create initial inventory log if quantity is provided
      if (quantity_in_stock && quantity_in_stock > 0) {
        await InventoryLog.create({
          product_id: product.product_id,
          change_type: "restock",
          quantity_change: quantity_in_stock,
          quantity_before: 0,
          quantity_after: quantity_in_stock,
          reason: "Initial stock",
        });
      }

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      console.error("Error creating product:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create product",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE PRODUCT ====================
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const {
        product_name,
        category_id,
        description,
        price,
        cost_price,
        reorder_level,
        unit,
        is_available,
        image_url,
      } = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if category exists if being updated
      if (category_id && category_id !== product.category_id) {
        const category = await Category.findByPk(category_id);
        if (!category) {
          return res.status(404).json({
            success: false,
            message: "Category not found",
          });
        }
      }

      await product.update({
        product_name: product_name ? product_name.trim() : product.product_name,
        category_id: category_id || product.category_id,
        description:
          description !== undefined ? description : product.description,
        price: price !== undefined ? price : product.price,
        cost_price: cost_price !== undefined ? cost_price : product.cost_price,
        reorder_level:
          reorder_level !== undefined ? reorder_level : product.reorder_level,
        unit: unit !== undefined ? unit : product.unit,
        is_available:
          is_available !== undefined ? is_available : product.is_available,
        image_url: image_url !== undefined ? image_url : product.image_url,
      });

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      console.error("Error updating product:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update product",
        error: error.message,
      });
    }
  },

  // ==================== DELETE PRODUCT ====================
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if product is in any pending/active orders
      const activeOrderItems = await OrderItem.count({
        where: { product_id: id },
        include: [
          {
            model: require("../models").Order,
            as: "order",
            where: { status: { [Op.notIn]: ["completed", "cancelled"] } },
          },
        ],
      });

      if (activeOrderItems > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete product that is in active orders",
        });
      }

      await product.destroy();

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete product",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE STOCK ====================
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, change_type, reason, employee_id } = req.body;

      if (!quantity || quantity === 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required and cannot be zero",
        });
      }

      const validChangeTypes = ["restock", "sale", "wastage", "adjustment"];
      if (change_type && !validChangeTypes.includes(change_type)) {
        return res.status(400).json({
          success: false,
          message: `Change type must be one of: ${validChangeTypes.join(", ")}`,
        });
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      try {
        await product.updateStock(
          parseInt(quantity),
          change_type || "adjustment",
          reason,
          employee_id || null
        );

        const updatedProduct = await Product.findByPk(id, {
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["category_name", "type"],
            },
          ],
        });

        res.status(200).json({
          success: true,
          message: "Stock updated successfully",
          data: updatedProduct,
        });
      } catch (error) {
        if (error.message === "Insufficient stock") {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock for this operation",
          });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update stock",
        error: error.message,
      });
    }
  },

  // ==================== RESTOCK PRODUCT ====================
  async restockProduct(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, employee_id } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.updateStock(
        parseInt(quantity),
        "restock",
        reason || "Stock replenishment",
        employee_id || null
      );

      const updatedProduct = await Product.findByPk(id);

      res.status(200).json({
        success: true,
        message: `Product restocked with ${quantity} units`,
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error restocking product:", error);
      res.status(500).json({
        success: false,
        message: "Failed to restock product",
        error: error.message,
      });
    }
  },

  // ==================== SET AVAILABILITY ====================
  async setAvailability(req, res) {
    try {
      const { id } = req.params;
      const { is_available } = req.body;

      if (is_available === undefined) {
        return res.status(400).json({
          success: false,
          message: "is_available field is required",
        });
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await product.setAvailability(is_available);

      res.status(200).json({
        success: true,
        message: `Product ${
          is_available ? "marked as available" : "marked as unavailable"
        }`,
        data: product,
      });
    } catch (error) {
      console.error("Error setting availability:", error);
      res.status(500).json({
        success: false,
        message: "Failed to set availability",
        error: error.message,
      });
    }
  },

  // ==================== GET LOW STOCK PRODUCTS ====================
  async getLowStockProducts(req, res) {
    try {
      const products = await Product.findAll({
        where: sequelize.where(
          sequelize.col("quantity_in_stock"),
          Op.lte,
          sequelize.col("reorder_level")
        ),
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_name", "type"],
          },
        ],
        order: [["quantity_in_stock", "ASC"]],
      });

      const productsWithStatus = products.map((product) => {
        const productData = product.toJSON();
        return {
          ...productData,
          is_out_of_stock: product.isOutOfStock(),
          stock_status: product.isOutOfStock() ? "Out of Stock" : "Low Stock",
        };
      });

      res.status(200).json({
        success: true,
        count: productsWithStatus.length,
        data: productsWithStatus,
      });
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch low stock products",
        error: error.message,
      });
    }
  },

  // ==================== GET OUT OF STOCK PRODUCTS ====================
  async getOutOfStockProducts(req, res) {
    try {
      const products = await Product.findAll({
        where: { quantity_in_stock: 0 },
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_name", "type"],
          },
        ],
        order: [["product_name", "ASC"]],
      });

      res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching out of stock products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch out of stock products",
        error: error.message,
      });
    }
  },

  // ==================== GET AVAILABLE PRODUCTS ====================
  async getAvailableProducts(req, res) {
    try {
      const { category_id } = req.query;
      const whereClause = {
        is_available: true,
        quantity_in_stock: { [Op.gt]: 0 },
      };

      if (category_id) {
        whereClause.category_id = category_id;
      }

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_id", "category_name", "type"],
          },
        ],
        order: [
          ["category_id", "ASC"],
          ["product_name", "ASC"],
        ],
      });

      res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching available products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch available products",
        error: error.message,
      });
    }
  },

  // ==================== GET PRODUCT STATISTICS ====================
  async getProductStatistics(req, res) {
    try {
      const totalProducts = await Product.count();
      const availableProducts = await Product.count({
        where: { is_available: true },
      });
      const unavailableProducts = await Product.count({
        where: { is_available: false },
      });
      const lowStockProducts = await Product.count({
        where: sequelize.where(
          sequelize.col("quantity_in_stock"),
          Op.lte,
          sequelize.col("reorder_level")
        ),
      });
      const outOfStockProducts = await Product.count({
        where: { quantity_in_stock: 0 },
      });

      // Total inventory value
      const inventoryValue = await Product.sum("quantity_in_stock", {
        attributes: [
          [sequelize.literal("SUM(quantity_in_stock * price)"), "total_value"],
        ],
      });

      // Products by category
      const productsByCategory = await Product.findAll({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("product_id")), "count"],
        ],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["category_id", "category_name", "type"],
          },
        ],
        group: ["category.category_id"],
        raw: false,
      });

      res.status(200).json({
        success: true,
        data: {
          total: totalProducts,
          available: availableProducts,
          unavailable: unavailableProducts,
          low_stock: lowStockProducts,
          out_of_stock: outOfStockProducts,
          inventory_value: parseFloat(inventoryValue || 0).toFixed(2),
          by_category: productsByCategory,
        },
      });
    } catch (error) {
      console.error("Error fetching product statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product statistics",
        error: error.message,
      });
    }
  },
};

module.exports = productController;
