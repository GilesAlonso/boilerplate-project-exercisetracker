const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Set up express app
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve HTML from the views directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Define Mongoose schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, required: true },
    },
  ],
});

const User = mongoose.model('User', userSchema);

// API Endpoints

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// POST /api/users/:_id/exercises - Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const exercise = {
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    };
    user.exercises.push(exercise);
    await user.save();
    res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// GET /api/users/:_id/logs - Get exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let logs = user.exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    if (from) {
      logs = logs.filter(ex => new Date(ex.date) >= new Date(from));
    }
    if (to) {
      logs = logs.filter(ex => new Date(ex.date) <= new Date(to));
    }
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      _id: user._id,
      count: logs.length,
      log: logs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
