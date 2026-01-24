import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: { 
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    match: [/^[A-Za-z]+$/, "Firstname must contain only alphabetic characters"]
  },
  lastname: { 
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    match: [/^[A-Za-z]+$/, "Lastname must contain only alphabetic characters"]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
  },
  username: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    immutable: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.model("User", userSchema);
