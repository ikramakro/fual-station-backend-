import { getAllRolesPermissions, getRolePermissions } from '../utils/permissions.js';
import { success } from '../utils/response.js';

export const listRoles = async (req, res) => {
  success(res, getAllRolesPermissions());
};

export const getMyPermissions = async (req, res) => {
  success(res, getRolePermissions(req.user.role));
};
