import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  tokenName: {
    type: String,
    required: true,
    trim: true,
    immutable: true
  },
  tokenHash: {
    type: String,
    required: false, // will be created by the controller
    unique: true,
    index: true,
    immutable: true
  },
  username: {
    type: String,
    required: true,
    immutable: true,
    index: true
  },
  role: {
    type: String,
    required: false, // will be created by the controller
    immutable: true
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
}, {
  timestamps: true, 
});

// Compound unique index: username can have multiple keys, but tokenName + username 
// must be unique
apiKeySchema.index({ username: 1, tokenName: 1 }, { unique: true });

export default mongoose.model("ApiKey", apiKeySchema);