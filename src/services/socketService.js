let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;

export const emitTankLevelUpdate = (stationId, tank) => {
  if (!ioInstance) return;
  const percentage = tank.capacity_liters
    ? Math.round((tank.current_stock_liters / tank.capacity_liters) * 100)
    : 0;
  ioInstance.to(`station:${stationId}`).emit('tank_level_updated', {
    tank_id: tank._id,
    current_stock_liters: tank.current_stock_liters,
    capacity_liters: tank.capacity_liters,
    percentage,
  });
  if (tank.current_stock_liters < tank.min_stock_threshold) {
    ioInstance.to(`station:${stationId}`).emit('low_fuel_alert', {
      tank_id: tank._id,
      tank_name: tank.name,
      fuel_type: tank.fuel_type,
      current_stock_liters: tank.current_stock_liters,
      threshold: tank.min_stock_threshold,
    });
  }
};

export const emitNewSale = (stationId, sale, cashierName) => {
  if (!ioInstance) return;
  ioInstance.to(`station:${stationId}`).emit('new_sale', {
    sale_number: sale.sale_number,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    cashier_name: cashierName,
  });
};
