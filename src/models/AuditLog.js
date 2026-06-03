import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
    module: { type: String, required: true },
    action: { type: String, required: true },
    table_name: { type: String },
    record_id: { type: mongoose.Schema.Types.ObjectId },
    before_value: { type: mongoose.Schema.Types.Mixed },
    after_value: { type: mongoose.Schema.Types.Mixed },
    ip_address: { type: String },
    device_info: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ station_id: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
