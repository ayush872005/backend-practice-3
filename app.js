const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/bankDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  _id: {
    type: String,
    required: true
  }
}, { 
  versionKey: '__v',
  timestamps: false 
});

const User = mongoose.model('User', userSchema);

// CREATE USERS ENDPOINT
app.post('/create-users', async (req, res) => {
  try {
    // Create sample users with specific IDs
    const users = [
      {
        _id: '686fbc457033f674a4840320',
        name: 'Alice',
        balance: 1000,
        __v: 0
      },
      {
        _id: '686fbc457033f674a4840321',
        name: 'Bob',
        balance: 500,
        __v: 0
      }
    ];

    // Clear existing users and insert new ones
    await User.deleteMany({});
    const createdUsers = await User.insertMany(users);

    res.status(201).json({
      message: 'Users created',
      users: createdUsers
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating users',
      error: error.message
    });
  }
});

// TRANSFER ENDPOINT
app.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;

    // Validation: Check if required fields are provided
    if (!fromUserId || !toUserId || !amount) {
      return res.status(400).json({
        message: 'Missing required fields: fromUserId, toUserId, and amount are required'
      });
    }

    // Validation: Check if amount is valid
    if (amount <= 0) {
      return res.status(400).json({
        message: 'Transfer amount must be greater than zero'
      });
    }

    // Validation: Check if trying to transfer to same account
    if (fromUserId === toUserId) {
      return res.status(400).json({
        message: 'Cannot transfer to the same account'
      });
    }

    // Step 1: Find both users
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    // Validation: Check if sender exists
    if (!fromUser) {
      return res.status(404).json({
        message: 'Sender account not found'
      });
    }

    // Validation: Check if receiver exists
    if (!toUser) {
      return res.status(404).json({
        message: 'Receiver account not found'
      });
    }

    // Step 2: CRITICAL VALIDATION - Check if sender has sufficient balance
    if (fromUser.balance < amount) {
      return res.status(400).json({
        message: 'Insufficient balance',
        currentBalance: fromUser.balance,
        requestedAmount: amount
      });
    }

    // Step 3: Calculate new balances
    const newFromBalance = fromUser.balance - amount;
    const newToBalance = toUser.balance + amount;

    // Step 4: Update sender's balance (deduct amount)
    await User.findByIdAndUpdate(
      fromUserId,
      { balance: newFromBalance }
    );

    // Step 5: Update receiver's balance (add amount)
    await User.findByIdAndUpdate(
      toUserId,
      { balance: newToBalance }
    );

    // Step 6: Return success response
    res.status(200).json({
      message: `Transferred $${amount} from ${fromUser.name} to ${toUser.name}`,
      senderBalance: newFromBalance,
      receiverBalance: newToBalance
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      message: 'Transfer failed',
      error: error.message
    });
  }
});

// GET ALL USERS ENDPOINT (for testing)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// GET USER BY ID ENDPOINT (for testing)
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('POST /create-users - Create sample users');
  console.log('POST /transfer - Transfer money between accounts');
  console.log('GET /users - Get all users');
  console.log('GET /users/:id - Get user by ID');
});

module.exports = app;
