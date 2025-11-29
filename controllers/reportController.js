const {
  Order,
  OrderItem,
  Product,
  Payment,
  Employee,
  Category,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

const reportController = {
  // ==================== DAILY SALES REPORT ====================
  async getDailySalesReport(req, res) {
    try {
      const { date } = req.query;

      let startDate, endDate;

      if (date) {
        startDate = new Date(date);
        endDate = new Date(date);
      } else {
        startDate = new Date();
        endDate = new Date();
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Get all orders for the day
      const orders = await Order.findAll({
        where: {
          order_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["product_name", "category_id"],
              },
            ],
          },
          {
            model: Payment,
            as: "payment",
            required: false,
          },
        ],
      });

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(
        (o) => o.status === "completed"
      ).length;
      const cancelledOrders = orders.filter(
        (o) => o.status === "cancelled"
      ).length;

      const totalRevenue = orders
        .filter((o) => o.status === "completed")
        .reduce((sum, order) => sum + parseFloat(order.final_amount), 0);

      const totalDiscount = orders.reduce(
        (sum, order) => sum + parseFloat(order.discount),
        0
      );

      const totalTax = orders.reduce(
        (sum, order) => sum + parseFloat(order.tax),
        0
      );

      // Payment methods breakdown
      const paymentsByMethod = orders
        .filter((o) => o.payment)
        .reduce((acc, order) => {
          const method = order.payment.payment_method;
          acc[method] = (acc[method] || 0) + parseFloat(order.final_amount);
          return acc;
        }, {});

      // Most sold items
      const itemsSold = {};
      orders.forEach((order) => {
        order.items.forEach((item) => {
          const productName = item.product.product_name;
          if (!itemsSold[productName]) {
            itemsSold[productName] = {
              name: productName,
              quantity: 0,
              revenue: 0,
            };
          }
          itemsSold[productName].quantity += item.quantity;
          itemsSold[productName].revenue += parseFloat(item.subtotal);
        });
      });

      const topItems = Object.values(itemsSold)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        date: date || new Date().toISOString().split("T")[0],
        summary: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_discount: parseFloat(totalDiscount.toFixed(2)),
          total_tax: parseFloat(totalTax.toFixed(2)),
          average_order_value:
            completedOrders > 0
              ? parseFloat((totalRevenue / completedOrders).toFixed(2))
              : 0,
        },
        payments_by_method: paymentsByMethod,
        top_selling_items: topItems,
      });
    } catch (error) {
      console.error("Error generating daily sales report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate daily sales report",
        error: error.message,
      });
    }
  },

  // ==================== MONTHLY SALES REPORT ====================
  async getMonthlySalesReport(req, res) {
    try {
      const { year, month } = req.query;

      const currentDate = new Date();
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();

      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      // Get all orders for the month
      const orders = await Order.findAll({
        where: {
          order_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                include: [
                  {
                    model: Category,
                    as: "category",
                    attributes: ["category_name", "type"],
                  },
                ],
              },
            ],
          },
          {
            model: Payment,
            as: "payment",
          },
        ],
      });

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(
        (o) => o.status === "completed"
      ).length;
      const cancelledOrders = orders.filter(
        (o) => o.status === "cancelled"
      ).length;

      const totalRevenue = orders
        .filter((o) => o.status === "completed")
        .reduce((sum, order) => sum + parseFloat(order.final_amount), 0);

      const totalDiscount = orders.reduce(
        (sum, order) => sum + parseFloat(order.discount),
        0
      );

      // Daily breakdown
      const dailyBreakdown = {};
      orders
        .filter((o) => o.status === "completed")
        .forEach((order) => {
          const day = new Date(order.order_date).getDate();
          if (!dailyBreakdown[day]) {
            dailyBreakdown[day] = { orders: 0, revenue: 0 };
          }
          dailyBreakdown[day].orders++;
          dailyBreakdown[day].revenue += parseFloat(order.final_amount);
        });

      // Sales by category
      const salesByCategory = {};
      orders.forEach((order) => {
        order.items.forEach((item) => {
          const category = item.product.category.category_name;
          if (!salesByCategory[category]) {
            salesByCategory[category] = { quantity: 0, revenue: 0 };
          }
          salesByCategory[category].quantity += item.quantity;
          salesByCategory[category].revenue += parseFloat(item.subtotal);
        });
      });

      res.status(200).json({
        success: true,
        month: targetMonth + 1,
        year: targetYear,
        summary: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_discount: parseFloat(totalDiscount.toFixed(2)),
          average_order_value:
            completedOrders > 0
              ? parseFloat((totalRevenue / completedOrders).toFixed(2))
              : 0,
          average_daily_revenue: parseFloat(
            (
              totalRevenue / new Date(targetYear, targetMonth + 1, 0).getDate()
            ).toFixed(2)
          ),
        },
        daily_breakdown: dailyBreakdown,
        sales_by_category: salesByCategory,
      });
    } catch (error) {
      console.error("Error generating monthly sales report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate monthly sales report",
        error: error.message,
      });
    }
  },

  // ==================== EMPLOYEE PERFORMANCE REPORT ====================
  async getEmployeePerformanceReport(req, res) {
    try {
      const { start_date, end_date, employee_id } = req.query;

      let dateFilter = {};
      if (start_date && end_date) {
        dateFilter.order_date = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else {
        // Default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        dateFilter.order_date = {
          [Op.between]: [firstDay, lastDay],
        };
      }

      let employeeFilter = {};
      if (employee_id) {
        employeeFilter.employee_id = employee_id;
      }

      // Get all employees
      const employees = await Employee.findAll({
        where: { is_active: true, ...employeeFilter },
        include: [
          {
            model: Order,
            as: "orders",
            where: dateFilter,
            required: false,
            include: [
              {
                model: OrderItem,
                as: "items",
              },
            ],
          },
          {
            model: Payment,
            as: "processed_payments",
            where: {
              payment_date: dateFilter.order_date,
            },
            required: false,
          },
        ],
      });

      const performanceData = employees.map((employee) => {
        const ordersHandled = employee.orders.length;
        const completedOrders = employee.orders.filter(
          (o) => o.status === "completed"
        ).length;

        const revenue = employee.orders
          .filter((o) => o.status === "completed")
          .reduce((sum, order) => sum + parseFloat(order.final_amount), 0);

        const itemsSold = employee.orders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
          );
        }, 0);

        const paymentsProcessed = employee.processed_payments.length;
        const paymentsTotal = employee.processed_payments.reduce(
          (sum, payment) => sum + parseFloat(payment.amount_paid),
          0
        );

        return {
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          role: employee.role,
          orders_handled: ordersHandled,
          completed_orders: completedOrders,
          revenue_generated: parseFloat(revenue.toFixed(2)),
          items_sold: itemsSold,
          payments_processed: paymentsProcessed,
          payments_total: parseFloat(paymentsTotal.toFixed(2)),
          average_order_value:
            completedOrders > 0
              ? parseFloat((revenue / completedOrders).toFixed(2))
              : 0,
        };
      });

      // Sort by revenue
      performanceData.sort((a, b) => b.revenue_generated - a.revenue_generated);

      res.status(200).json({
        success: true,
        period: {
          start:
            start_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).toISOString(),
          end:
            end_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0
            ).toISOString(),
        },
        count: performanceData.length,
        data: performanceData,
      });
    } catch (error) {
      console.error("Error generating employee performance report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate employee performance report",
        error: error.message,
      });
    }
  },

  // ==================== MOST SOLD ITEMS REPORT ====================
  async getMostSoldItemsReport(req, res) {
    try {
      const { start_date, end_date, limit = 20 } = req.query;

      let dateFilter = {};
      if (start_date && end_date) {
        dateFilter = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else {
        // Default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        dateFilter = {
          [Op.between]: [firstDay, lastDay],
        };
      }

      // Get all order items within the date range
      const orderItems = await OrderItem.findAll({
        include: [
          {
            model: Order,
            as: "order",
            where: {
              order_date: dateFilter,
              status: "completed",
            },
            attributes: [],
          },
          {
            model: Product,
            as: "product",
            attributes: ["product_id", "product_name", "price"],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["category_name", "type"],
              },
            ],
          },
        ],
        attributes: [
          "product_id",
          [sequelize.fn("SUM", sequelize.col("quantity")), "total_quantity"],
          [sequelize.fn("SUM", sequelize.col("subtotal")), "total_revenue"],
          [
            sequelize.fn("COUNT", sequelize.col("order_item_id")),
            "order_count",
          ],
        ],
        group: ["product_id", "product.product_id"],
        order: [[sequelize.fn("SUM", sequelize.col("quantity")), "DESC"]],
        limit: parseInt(limit),
        subQuery: false,
      });

      const mostSoldItems = orderItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.product_name,
        category: item.product.category.category_name,
        category_type: item.product.category.type,
        unit_price: parseFloat(item.product.price).toFixed(2),
        total_quantity_sold: parseInt(item.dataValues.total_quantity),
        total_revenue: parseFloat(item.dataValues.total_revenue).toFixed(2),
        times_ordered: parseInt(item.dataValues.order_count),
        average_quantity_per_order: parseFloat(
          (
            item.dataValues.total_quantity / item.dataValues.order_count
          ).toFixed(2)
        ),
      }));

      res.status(200).json({
        success: true,
        period: {
          start:
            start_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).toISOString(),
          end:
            end_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0
            ).toISOString(),
        },
        count: mostSoldItems.length,
        data: mostSoldItems,
      });
    } catch (error) {
      console.error("Error generating most sold items report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate most sold items report",
        error: error.message,
      });
    }
  },

  // ==================== SALES BY CATEGORY REPORT ====================
  async getSalesByCategoryReport(req, res) {
    try {
      const { start_date, end_date } = req.query;

      let dateFilter = {};
      if (start_date && end_date) {
        dateFilter = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else {
        // Default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        dateFilter = {
          [Op.between]: [firstDay, lastDay],
        };
      }

      const categoryStats = await OrderItem.findAll({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("quantity")), "total_quantity"],
          [sequelize.fn("SUM", sequelize.col("subtotal")), "total_revenue"],
          [sequelize.fn("COUNT", sequelize.col("order_item_id")), "item_count"],
        ],
        include: [
          {
            model: Order,
            as: "order",
            where: {
              order_date: dateFilter,
              status: "completed",
            },
            attributes: [],
          },
          {
            model: Product,
            as: "product",
            attributes: [],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["category_id", "category_name", "type"],
              },
            ],
          },
        ],
        group: [
          "product->category.category_id",
          "product->category.category_name",
          "product->category.type",
        ],
        order: [[sequelize.fn("SUM", sequelize.col("subtotal")), "DESC"]],
        subQuery: false,
        raw: false,
      });

      const formattedStats = categoryStats.map((stat) => ({
        category_id: stat.product.category.category_id,
        category_name: stat.product.category.category_name,
        category_type: stat.product.category.type,
        total_items_sold: parseInt(stat.dataValues.total_quantity),
        total_revenue: parseFloat(stat.dataValues.total_revenue).toFixed(2),
        number_of_orders: parseInt(stat.dataValues.item_count),
      }));

      const totalRevenue = formattedStats.reduce(
        (sum, cat) => sum + parseFloat(cat.total_revenue),
        0
      );

      const statsWithPercentage = formattedStats.map((stat) => ({
        ...stat,
        revenue_percentage: parseFloat(
          ((parseFloat(stat.total_revenue) / totalRevenue) * 100).toFixed(2)
        ),
      }));

      res.status(200).json({
        success: true,
        period: {
          start:
            start_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).toISOString(),
          end:
            end_date ||
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0
            ).toISOString(),
        },
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        count: statsWithPercentage.length,
        data: statsWithPercentage,
      });
    } catch (error) {
      console.error("Error generating sales by category report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate sales by category report",
        error: error.message,
      });
    }
  },

  // ==================== REVENUE OVER TIME REPORT ====================
  async getRevenueOverTimeReport(req, res) {
    try {
      const { start_date, end_date, interval = "daily" } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);

      const orders = await Order.findAll({
        where: {
          order_date: {
            [Op.between]: [startDate, endDate],
          },
          status: "completed",
        },
        attributes: ["order_date", "final_amount"],
      });

      // Group by interval
      const revenueData = {};

      orders.forEach((order) => {
        let key;
        const date = new Date(order.order_date);

        if (interval === "daily") {
          key = date.toISOString().split("T")[0];
        } else if (interval === "weekly") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else if (interval === "monthly") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        }

        if (!revenueData[key]) {
          revenueData[key] = { orders: 0, revenue: 0 };
        }
        revenueData[key].orders++;
        revenueData[key].revenue += parseFloat(order.final_amount);
      });

      const sortedData = Object.keys(revenueData)
        .sort()
        .map((key) => ({
          period: key,
          orders: revenueData[key].orders,
          revenue: parseFloat(revenueData[key].revenue.toFixed(2)),
        }));

      res.status(200).json({
        success: true,
        interval,
        start_date,
        end_date,
        count: sortedData.length,
        data: sortedData,
      });
    } catch (error) {
      console.error("Error generating revenue over time report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate revenue over time report",
        error: error.message,
      });
    }
  },
};

module.exports = reportController;
