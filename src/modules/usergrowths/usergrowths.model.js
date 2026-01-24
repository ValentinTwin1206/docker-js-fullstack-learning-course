import mongoose from "mongoose";

const userGrowthSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true // Optimized for range queries
  },
  registrations: {
    type: Number,
    default: 0
  },
  deletions: {
    type: Number,
    default: 0
  }
},
{ 
  timestamps: true,
  toJSON: { 
    virtuals: true 
  },
  toObject: { 
    virtuals: true
  }
});

/**
 * Virtual field for netGrowth. 
 * This calculates (Reg - Del) on the fly without storing it.
 */
userGrowthSchema.virtual('netGrowth').get(function() {
  return this.registrations - this.deletions;
});

export default mongoose.model("UserGrowth", userGrowthSchema);