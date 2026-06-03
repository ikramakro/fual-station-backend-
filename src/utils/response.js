export const success = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

export const paginated = (res, items, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination,
  });
};
