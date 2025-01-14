const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const shortid = require('shortid');

// Set up middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json()); // For parsing application/json

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not defined!');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const User = mongoose.model('User', userSchema);

// Define Exercise schema and model
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, default: Date.now },
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  newUser.save()
    .then(user => {
      res.json({
        username: user.username,
        _id: user._id,
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Server Error');
    });
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const exerciseDate = date || new Date().toISOString(); // Default to current date if no date is provided

  const newExercise = new Exercise({
    userId: _id,
    description,
    duration,
    date: exerciseDate,
  });

  newExercise.save()
    .then(exercise => {
      res.json({
        username: exercise.userId,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date,
        _id: _id,
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Server Error');
    });
});

// Get exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    let query = { userId: _id };

    // If 'from' or 'to' query parameters are provided, handle date filtering
    if (from || to) {
      query.date = {};

      if (from) {
        const fromDate = new Date(from);
        query.date.$gte = fromDate.toISOString(); // Use ISO string for comparison
      }

      if (to) {
        const toDate = new Date(to);
        query.date.$lte = toDate.toISOString(); // Use ISO string for comparison
      }
    }

    let exercises = await Exercise.find(query).select('description duration date');

    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date,
      })),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Server Error');
  }
});

// Recycled Timestamp route
app.get("/api/hello", (req, res) => {
  res.json({ greeting: 'hello API' });
});

app.get("/api/:date?", (req, res) => {
  const dateString = req.params.date || '';
  const date = dateString ? new Date(dateString) : new Date();

  if (isNaN(date.getTime())) {
    return res.json({ error: 'Invalid Date' });
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString(),
  });
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
