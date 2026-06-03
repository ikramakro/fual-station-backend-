import Product from '../models/Product.js';
import ProductCategory from '../models/ProductCategory.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listProducts = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    is_active: req.query.includeInactive !== 'true',
    ...buildSearchFilter(req.query.search, ['name']),
  };
  if (filter.is_active === false) delete filter.is_active;
  if (req.query.is_fuel !== undefined) filter.is_fuel = req.query.is_fuel === 'true';
  const [items, total] = await Promise.all([
    Product.find(filter).populate('category_id').skip(skip).limit(limit).sort({ name: 1 }),
    Product.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, station_id: req.user.station_id }).populate('category_id');
  if (!product) throw new AppError('Product not found', 404);
  success(res, product);
};

export const createProduct = async (req, res) => {
  const product = await Product.create({ ...req.body, station_id: req.user.station_id });
  success(res, product, 'Product created', 201);
};

export const updateProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  success(res, product, 'Product updated');
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  success(res, product, 'Product deactivated');
};

export const listCategories = async (req, res) => {
  const categories = await ProductCategory.find({ station_id: req.user.station_id }).sort({ name: 1 });
  success(res, categories);
};

export const createCategory = async (req, res) => {
  const category = await ProductCategory.create({ ...req.body, station_id: req.user.station_id });
  success(res, category, 'Category created', 201);
};

export const updateCategory = async (req, res) => {
  const category = await ProductCategory.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!category) throw new AppError('Category not found', 404);
  success(res, category, 'Category updated');
};

export const deleteCategory = async (req, res) => {
  await ProductCategory.deleteOne({ _id: req.params.id, station_id: req.user.station_id });
  success(res, null, 'Category deleted');
};
