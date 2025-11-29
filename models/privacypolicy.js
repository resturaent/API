"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrivacyPolicy extends Model {
    static associate(models) {}

    static async getActiveVersion() {
      return await this.findOne({
        where: { isActive: true },
        order: [["effectiveDate", "DESC"]],
      });
    }

    static async getAllVersions() {
      return await this.findAll({
        order: [["effectiveDate", "DESC"]],
      });
    }

    static async setActiveVersion(versionId) {
      const transaction = await sequelize.transaction();

      try {
        await this.update({ isActive: false }, { where: {}, transaction });

        await this.update(
          { isActive: true },
          { where: { id: versionId }, transaction }
        );

        await transaction.commit();
        return await this.findByPk(versionId);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  }

  PrivacyPolicy.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
          msg: "This version already exists",
        },
        validate: {
          notEmpty: {
            msg: "Version cannot be empty",
          },
          is: {
            args: /^[0-9]+\.[0-9]+\.[0-9]+$/,
            msg: "Version must follow semantic versioning (e.g., 1.0.0)",
          },
        },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Privacy Policy",
        validate: {
          notEmpty: {
            msg: "Title cannot be empty",
          },
          len: {
            args: [3, 255],
            msg: "Title must be between 3 and 255 characters",
          },
        },
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Content cannot be empty",
          },
          len: {
            args: [10],
            msg: "Content must be at least 10 characters long",
          },
        },
      },
      effectiveDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: {
            msg: "Effective date must be a valid date",
          },
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      lastModifiedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      changesSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PrivacyPolicy",
      tableName: "PrivacyPolicies",
      timestamps: true,
      indexes: [
        {
          fields: ["version"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["effectiveDate"],
        },
      ],
    }
  );

  return PrivacyPolicy;
};
