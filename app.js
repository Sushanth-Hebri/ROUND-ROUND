const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
require('dotenv').config();



const app = express();
const port = 3000;

// Connect to MongoDB Atlas (replace YOUR_CONNECTION_STRING with your actual connection string)
mongoose
  .connect(
    process.env.MONGO,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Define mongoose schema for User
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// Create a mongoose model for User
const User = mongoose.model("User", userSchema);

// Define mongoose schema for Story
const storySchema = new mongoose.Schema({
  story_id: String,
  story_title: String,
  description: String,
  rating: Number,
  story_script: String,
  genre: String,
});

app.use(bodyParser.json());
app.set("view engine", "ejs");
// Use express-session middleware
app.use(
  session({
    secret: "sushanth", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

// Create a mongoose model for Story
const Story = mongoose.model("Story", storySchema);

// Serve static files from the 'public' folder
app.use(express.static("public"));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// Serve the admin.html page
app.get("/admin", (req, res) => {
  res.sendFile("admin.html", { root: "public" });
});

app.get("/subscribe", (req, res) => {
  res.sendFile("subscribe.html", { root: "public" });
});

// Serve signup.html
app.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: "public" });
});

app.get("/home.html", (req, res) => {
  const email = req.session.email;

  // If the email is not in the session, redirect to the sign-in page
  if (!email) {
    return res.redirect("/signin");
  }

  // Use an absolute path for res.sendFile
  const filePath = path.join(__dirname, "public", "home.html");

  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      // Handle any errors that occurred while sending the file
      console.error("Error sending home.html:", err);
      res.status(500).send("Internal Server Error");
    }
  });
});

app.get("/signin", (req, res) => {
  res.sendFile("signin.html", { root: "public" });
});

app.get("/about", (req, res) => {
  res.sendFile("about.html", { root: "public" });
});

app.get("/genres", (req, res) => {
  res.sendFile("genres.html", { root: "public" });
});

// app.get("/profile", (req, res) => {
//   res.sendFile("profile.html", { root: "public" });
// });

app.get("/genres/:genre", (req, res) => {
  const genre = req.params.genre;
  const filePath = path.join(__dirname, "public", "genre", `${genre}.html`);

  // Check if the genre file exists, and send it if it does
  res.sendFile(filePath, (err) => {
    if (err) {
      // If the file doesn't exist, you can handle it as per your requirements
      res.status(404).send("Genre not found");
    }
  });
});

app.get("/profile", (req, res) => {
  // Retrieve the email from the session
  const email = req.session.email;

  // If the email is not in the session, redirect to the sign-in page
  if (!email) {
    return res.redirect("/signin");
  }
  else{
    res.sendFile("profile.html", { root: "public" });
  }

  
});

app.get("/signout", (req, res) => {
  // Destroy the session when the user signs out
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/signin");
  });
});

// // Handle signup form submission
// app.post("/signup", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Hash the password before saving it
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create a new user
//     const newUser = new User({
//       email,
//       password: hashedPassword,
//     });

//     // Save the user to the database
//     await newUser.save();

//     // Redirect to home.html after successful signup
//     res.redirect("/signin");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error registering user");
//   }
// });

// Handle signin form submission
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user in the database
    const user = await User.findOne({ email });

    // Check if the user exists and the password is correct
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.email = email;
      // Redirect to home.html after successful signin
      res.redirect("/home.html");
    } else {
      res.status(401).send("Invalid email or password");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error during signin");
  }
});

// Example to check if the user is authenticated
app.get("/checkAuth", (req, res) => {
  const userEmail = req.session.email;
  if (userEmail) {
    console.log(`User authenticated: ${userEmail}`);
    res.send(`User authenticated: ${userEmail}`);
  } else {
    console.log("User not authenticated");
    res.send("User not authenticated");
  }
});

// app.js
// app.get('/story', async (req, res) => {
//     try {
//         console.log('Fetching stories...');
//         const stories = await Story.find();
//         console.log('Fetched stories:', stories);

//         // Render the EJS template with data
//         res.render('story', { stories });
//     } catch (error) {
//         console.error('Error fetching stories:', error);
//         res.status(500).send('Error fetching stories');
//     }
// });
app.get("/story", async (req, res) => {
  try {
    // Retrieve the story_id from the query parameters
    const storyId = req.query.story_id;

    if (!storyId) {
      // If no story_id provided, return 400 Bad Request
      console.log("No story_id provided");
      return res.status(400).send("Bad Request: story_id not provided");
    }

    console.log("Fetching story with story_id:", storyId);
    // Fetch the story with the given story_id
    const story = await Story.findOne({ story_id: storyId });

    if (!story) {
      // If no story found, redirect to error.html
      console.log("Story not found with story_id:", storyId);
      return res.status(404).send("Story not found");
    }
    // Continue with the rest of your code if the story is found

    console.log("Fetched story:", story);
    // Render the EJS template with the story
    res.render("story", { story });
  } catch (error) {
    console.error("Error fetching story:", error);
    res.status(500).send("Error fetching story");
  }
});


app.post('/api/genre', async (req, res) => {
  console.log("im being called");
  const selectedGenre = req.body.genre;
  console.log(selectedGenre);

  try {
    // Fetch all stories from the collection based on the selected genre
    const stories = await Story.find({ genre: selectedGenre });

    // Log the fetched documents to the console
    console.log('Fetched documents:', stories);

    // Prepare the response data
    const updatedContent = stories.map(story => ({
      story_id: story.story_id,
      story_title: story.story_title,
      description: story.description,
      rating: story.rating,
      story_script: story.story_script,
      // Add other properties as needed
    }));

    // Send the response back to home.js
    res.json({ updatedContent });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/user/email', (req, res) => {
  // Retrieve email from the session
  const userEmail = req.session.email;

  // Send the email in the response
  res.json({ email: userEmail });
});






// Handle signup form submission
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
 
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user with email and hashed password
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await newUser.save();
    res.redirect("/signin"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user");
  }
});





// Add a new story to the database
app.post("/add-story", async (req, res) => {
  const { story_id, story_title, description, rating, story_script, genre } = req.body;

  try {
    const newStory = new Story({
      story_id,
      story_title,
      description,
      rating,
      story_script,
      genre,
    });

    await newStory.save();
    res.send("Story added successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding story");
  }
});














module.exports = app;

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
