// /controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  const newUser = await User.create({ email, password });
  const token = createToken(newUser._id);
  res.status(201).json({ token });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log("This is authController.")
  const user = await User.findOne({ email });
  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = createToken(user._id);
  res.status(200).json({ token });
};
