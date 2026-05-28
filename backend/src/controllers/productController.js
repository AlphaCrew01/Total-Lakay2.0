import { Product, Category, Review } from '../models/index.js';
import { ERROR_MESSAGES } from '../config/constants.js';

export const productController = {
  // Get all products with filters
  getAllProducts: async (req, res) => {
    try {
      const { page = 1, limit = 20, category, search, sortBy = 'createdAt', order = 'DESC' } = req.query;
      const offset = (page - 1) * limit;

      let where = { isActive: true };

      if (category) {
        where.category = category;
      }

      if (search) {
        where = {
          ...where,
          [require('sequelize').Op.or]: [
            { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
            { description: { [require('sequelize').Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const products = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, order]],
        include: [
          {
            model: Review,
            as: 'reviews',
            attributes: ['rating', 'comment', 'createdAt']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          products: products.rows,
          pagination: {
            total: products.count,
            pages: Math.ceil(products.count / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Get single product
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
        include: [
          {
            model: Review,
            as: 'reviews',
            attributes: ['id', 'rating', 'comment', 'title', 'images', 'createdAt']
          }
        ]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product by id error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Create product (Admin only)
  createProduct: async (req, res) => {
    try {
      const { name, description, category, price, stock, images, isVirtual, isDigital, downloadUrl } = req.body;

      if (!name || !description || !category || !price) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const product = await Product.create({
        name,
        description,
        category,
        price,
        stock,
        images: images || [],
        isVirtual: isVirtual !== false,
        isDigital: isDigital !== false,
        downloadUrl,
        sku: `SKU-${Date.now()}` // Generate SKU
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Update product (Admin only)
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      await product.update(updates);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Delete product (Admin only)
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      await product.destroy();

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
};

export default productController;
