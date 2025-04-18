const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

const app = express();
const cors = require('cors');
app.use(cors());

const Stock = require('../../backend/mongodb/schema/stock');
const User = require('../../backend/mongodb/schema/user');
const Activity = require('../../backend/mongodb/schema/activity');

const createToken = (id) => {
  return jwt.sign({ _id: id }, process.env.SECRET, { expiresIn: '14d' });
};

// Middleware TO PARSE JSON body
app.use(express.json());
// URLENCODED WOULD ALLOW US TO GET ACCESS TO : req.body
app.use(
  express.urlencoded({
    extended: true,
  })
);

// 🛢️ Connect to MongoDB using Mongoose
mongoose.set('strictQuery', true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB via Mongoose'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err));

// WELCOME ROUTE "/"
app.get('/', (req, res) => {
  res.send('Welcome to the Express API! 🚀');
});

// LOGIN & REGISTRATION -------------

// REGISTRATION
app.post('/api/register', async (req, res) => {
  try {
    const { password, email, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ message: 'Email, password, and full name are required.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // Hash password
    const saltRounds = 12; // number of rounds for  randomization
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // THIS IS WHAT WILL BE SAVED TO MONGODB
    let newUser = new User({
      email: email,
      hashedPassword: hashedPassword,
      fullName: fullName,
    });

    // SAVE THE USER TO THE DATABASE
    await newUser.save();

    // AFTER SAVING: create JWT for remembering sessions
    const token = createToken(newUser._id);

    res.status(201).json({
      message: 'Registration successful!',
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong.',
      error: error.message,
    });
  }
});

// LOGIN + ACTIVITY LOGGING
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email: email });

    // if user does not exist throw an error
    if (!existingUser) {
      return res.status(400).json({ message: 'Incorrect email or password.' });
    }

    // compare the incoming password against the password in the database
    const validPassword = await bcrypt.compare(
      password,
      existingUser.hashedPassword
    );

    // if password does not match throw an error
    if (!validPassword) {
      return res.status(400).json({ message: 'Incorrect email or password.' });
    }

    // IF LOGIN IS SUCCESSFUL: CREATE A TOKEN
    if (validPassword) {
      const token = createToken(existingUser._id);

      // Log the login activity
      await Activity.create({
        userId: existingUser._id,
        action: 'Logged In',
      });

      return res.status(200).json({
        message: 'Login Successful!',
        token: token,
        userId: existingUser._id,
      });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

// GET USER ACTIVITY LOGS PER USERID
app.get('/api/activity_logs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all activities with user and stock info
    const activities = await Activity.find({ userId })
      .populate('userId', 'fullName') // Get user's full name
      .populate('stockId', 'item expectedCount detectedCount') // Get stock details
      .sort({ createdAt: -1 });

    // Format response
    const formattedActivities = activities.map((activity) => ({
      _id: activity._id,
      userId: activity.userId?._id, // ✅ Explicitly include userId
      fullName: activity.userId?.fullName ?? 'Unknown User', // ✅ Include fullName
      action: activity.action,
      stockItem: activity.stockId?.item ?? 'N/A', // Get stock item name
      countedAmount: activity.countedAmount,
      expectedStock: activity.stockId?.expectedCount ?? 0,
      detectedStock: activity.stockId?.detectedCount ?? 0,
      timestamp: activity.createdAt, // ✅ Keep the timestamp
    }));
    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error('❌ Error fetching activity logs per user:', error);
    res
      .status(500)
      .json({ message: 'Error fetching activity logs', error: error.message });
  }
});

// GET ALL USER ACTIVITY LOGS
app.get('/api/activity_logs/', async (req, res) => {
  try {
    // Fetch all activities and populate userId to get both userId and fullName
    const activities = await Activity.find() // JUST REMOVE THE FILTER TO GET ALL ACTIVITIES
      .populate('userId', 'fullName') // Fetch fullName from User model
      .sort({ createdAt: -1 }); // Sort latest first

    // Format response to explicitly include userId
    const formattedActivities = activities.map((activity) => ({
      _id: activity._id,
      userId: activity.userId?._id, // ✅ Explicitly include userId
      fullName: activity.userId?.fullName ?? 'Unknown User', // ✅ Include fullName
      action: activity.action,
      objectCount: activity.objectCount,
      timestamp: activity.createdAt, // ✅ Keep the timestamp
    }));

    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error('❌ Error fetching all activity logs:', error);

    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

// NUMBER OF STOCKS and DETECTIONS DATA -------------

// Save stock categories
app.post('/api/stocks', async (req, res) => {
  try {
    for (const item in req.body) {
      await Stock.findOneAndUpdate(
        { item },
        { expectedCount: req.body[item] },
        { upsert: true }
      );
    }
    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stocks/:item', async (req, res) => {
  try {
    const itemName = req.params.item;
    await Stock.deleteOne({ item: itemName });
    res.json({ message: `Deleted ${itemName} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all stock
app.get('/api/stocks', async (req, res) => {
  const stocks = await Stock.find();
  res.json(stocks);
});

const PORT = 2000;
app.listen(PORT, () => {
  console.log(`Connected to server at ${PORT}`);
});


app.post('/api/count_objects', async (req, res) => {
  try {
    const { userId, stockItem, countedAmount } = req.body;

    if (!userId || !stockItem || countedAmount === undefined) {
      return res
        .status(400)
        .json({ message: 'User ID, stock item, and count are required' });
    }

    // Find the stock item
    const stock = await Stock.findOne({ item: stockItem });
    if (!stock) {
      return res
        .status(404)
        .json({ message: `Stock item '${stockItem}' not found` });
    }

    // Log the activity
    await Activity.create({
      userId,
      action: `Counted ${countedAmount} of ${stockItem}`,
      stockId: stock._id,
      countedAmount,
    });

    // Update detectedCount
    stock.detectedCount += countedAmount;
    await stock.save();

    res
      .status(200)
      .json({ message: 'Object count logged and stock updated successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error logging object count', error: error.message });
  }
});

// // Save detected objects
// app.post('/api/detections', async (req, res) => {
//   try {
//     const { item, detectedCount } = req.body; // Extract item and count

//     if (!item || detectedCount === undefined) {
//       return res
//         .status(400)
//         .json({ message: 'Item and detected count are required' });
//     }

//     await Stock.findOneAndUpdate(
//       { item }, // Find stock by item name
//       { $set: { detectedCount } }, // Update detected count
//       { upsert: true, new: true } // Create new if not found
//     );

//     res.json({ message: 'Detections updated successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
