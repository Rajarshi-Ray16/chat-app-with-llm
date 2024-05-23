const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const router = express.Router();

// Get All Users Route
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude the password field
    res.status(200).json(users);
  } catch (error) {
    console.error('Error retrieving users', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Signup Route
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Trying");
    const existingUser = await User.findOne({ email });
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const status = "AVAILABLE";

    const newUser = new User({
      email,
      password: hashedPassword,
      status
    });

    // console.log(newUser);

    await newUser.save();

    const token = jwt.sign({ email: newUser.email, id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update the user's status to AVAILABLE
    await user.save();

    const token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Logout Route
router.post('/logout', async (req, res) => {
  const { email } = req.body;
  // console.log(req.body);

  try {
    const user = await User.findOne({ email });

    if (!user) {
    console.log("User not found");
      return res.status(404).json({ message: 'User not found' });
    }

    await user.save();

    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    console.log("Error");
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.put("/status", async (req, res) => {
  const { status, email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating user status', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

async (req, res) => {
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating user status', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

module.exports = router;
