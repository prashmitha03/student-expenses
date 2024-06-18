const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const expenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone_number: { type: Number, required:true,},
  password: { type: String, required: true },
  expenses: [expenseSchema],
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
