import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: { 
    type: String, 
    required: true,
    immutable: true
  },
  isBinary: { 
    type: Boolean, 
    required: false,
    default: false 
  },
  filename: { 
    type: String, 
    required: true 
  },
  mimetype: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  uploadedBy: { 
    type: String, 
    required: true 
  },
  fileStorageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }
}, 
{ 
  timestamps: true 
});

fileSchema.index({ originalName: 'text' });

// Ensure virtual fields are serialized when converting to JSON
fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

export default mongoose.model("File", fileSchema);
