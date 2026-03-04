import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: [
      "admin",
      "sysadmin",
      "user"
    ], 
  },
  description: { 
    type: String,
    required: false
  }
},
{
  timestamps: true
});

export default mongoose.model("Role", roleSchema);
