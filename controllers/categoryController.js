const { Category, Product } = require("../models");
const { Op } = require("sequelize");

const categoryController = {
  // ==================== GET ALL CATEGORIES ====================
  async getAllCategories(req, res) {
    try {
      const { type, is_active, include_products } = req.query;
      const whereClause = {};

      // Filter by type
      if (type) {
        whereClause.type = type;
      }

      // Filter by active status
      if (is_active !== undefined) {
        whereClause.is_active = is_active === "true";
      }

      const includeOptions = [];

      // Include products if requested
      if (include_products === "true") {
        includeOptions.push({
          model: Product,
          as: "products",
          attributes: [
            "product_id",
            "product_name",
            "price",
            "is_available",
            "quantity_in_stock",
          ],
        });
      }

      const categories = await Category.findAll({
        where: whereClause,
        include: includeOptions,
        order: [["category_name", "ASC"]],
      });

      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  },

  // ==================== GET SINGLE CATEGORY ====================
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id, {
        include: [
          {
            model: Product,
            as: "products",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category",
        error: error.message,
      });
    }
  },

  // ==================== CREATE CATEGORY ====================
  async createCategory(req, res) {
    try {
      const { category_name, type, description, is_active } = req.body;

      // Validate required fields
      if (!category_name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      // Validate type
      const validTypes = ["meal", "drink", "dessert", "appetizer"];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type must be one of: ${validTypes.join(", ")}`,
        });
      }

      // Check if category name already exists
      const existingCategory = await Category.findOne({
        where: { category_name: category_name.trim() },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }

      const category = await Category.create({
        category_name: category_name.trim(),
        type: type || "meal",
        description,
        is_active: is_active !== undefined ? is_active : true,
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error("Error creating category:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  },

  // ==================== UPDATE CATEGORY ====================
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { category_name, type, description, is_active } = req.body;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Validate type if provided
      if (type) {
        const validTypes = ["meal", "drink", "dessert", "appetizer"];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            success: false,
            message: `Type must be one of: ${validTypes.join(", ")}`,
          });
        }
      }

      // Check if new category name already exists
      if (category_name && category_name.trim() !== category.category_name) {
        const existingCategory = await Category.findOne({
          where: { category_name: category_name.trim() },
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Category name already exists",
          });
        }
      }

      await category.update({
        category_name: category_name
          ? category_name.trim()
          : category.category_name,
        type: type || category.type,
        description:
          description !== undefined ? description : category.description,
        is_active: is_active !== undefined ? is_active : category.is_active,
      });

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      console.error("Error updating category:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message,
      });
    }
  },

  // ==================== DELETE CATEGORY ====================
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if category has products
      const productCount = await Product.count({
        where: { category_id: id },
      });

      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category with ${productCount} product(s). Please reassign or delete products first.`,
        });
      }

      await category.destroy();

      res.status(200).json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete category",
        error: error.message,
      });
    }
  },

  // ==================== ACTIVATE CATEGORY ====================
  async activateCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (category.is_active) {
        return res.status(400).json({
          success: false,
          message: "Category is already active",
        });
      }

      await category.activate();

      res.status(200).json({
        success: true,
        message: "Category activated successfully",
        data: category,
      });
    } catch (error) {
      console.error("Error activating category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to activate category",
        error: error.message,
      });
    }
  },

  // ==================== DEACTIVATE CATEGORY ====================
  async deactivateCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (!category.is_active) {
        return res.status(400).json({
          success: false,
          message: "Category is already inactive",
        });
      }

      await category.deactivate();

      res.status(200).json({
        success: true,
        message: "Category deactivated successfully",
        data: category,
      });
    } catch (error) {
      console.error("Error deactivating category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to deactivate category",
        error: error.message,
      });
    }
  },

  // ==================== GET CATEGORIES BY TYPE ====================
  async getCategoriesByType(req, res) {
    try {
      const { type } = req.params;

      const validTypes = ["meal", "drink", "dessert", "appetizer"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type must be one of: ${validTypes.join(", ")}`,
        });
      }

      const categories = await Category.findAll({
        where: { type },
        include: [
          {
            model: Product,
            as: "products",
            attributes: ["product_id", "product_name", "price", "is_available"],
          },
        ],
        order: [["category_name", "ASC"]],
      });

      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching categories by type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  },

  // ==================== GET ACTIVE CATEGORIES ====================
  async getActiveCategories(req, res) {
    try {
      const categories = await Category.findAll({
        where: { is_active: true },
        include: [
          {
            model: Product,
            as: "products",
            where: { is_available: true },
            required: false,
            attributes: [
              "product_id",
              "product_name",
              "price",
              "quantity_in_stock",
            ],
          },
        ],
        order: [["category_name", "ASC"]],
      });

      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching active categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active categories",
        error: error.message,
      });
    }
  },

  // ==================== GET CATEGORY STATISTICS ====================
  async getCategoryStatistics(req, res) {
    try {
      const totalCategories = await Category.count();
      const activeCategories = await Category.count({
        where: { is_active: true },
      });
      const inactiveCategories = await Category.count({
        where: { is_active: false },
      });

      // Get categories by type with product counts
      const categoriesByType = await Category.findAll({
        attributes: [
          "type",
          [
            Category.sequelize.fn(
              "COUNT",
              Category.sequelize.col("category_id")
            ),
            "count",
          ],
        ],
        group: ["type"],
      });

      // Get category with most products
      const categoriesWithProductCount = await Category.findAll({
        attributes: [
          "category_id",
          "category_name",
          "type",
          [
            Category.sequelize.fn(
              "COUNT",
              Category.sequelize.col("products.product_id")
            ),
            "product_count",
          ],
        ],
        include: [
          {
            model: Product,
            as: "products",
            attributes: [],
          },
        ],
        group: ["Category.category_id"],
        order: [
          [
            Category.sequelize.fn(
              "COUNT",
              Category.sequelize.col("products.product_id")
            ),
            "DESC",
          ],
        ],
        limit: 5,
        subQuery: false,
        raw: true,
      });

      res.status(200).json({
        success: true,
        data: {
          total: totalCategories,
          active: activeCategories,
          inactive: inactiveCategories,
          by_type: categoriesByType,
          top_categories_by_products: categoriesWithProductCount,
        },
      });
    } catch (error) {
      console.error("Error fetching category statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category statistics",
        error: error.message,
      });
    }
  },
};

module.exports = categoryController;
