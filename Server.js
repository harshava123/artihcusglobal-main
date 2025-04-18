require("dotenv").config(); // Load environment variables
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const multer = require("multer");
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3001; // Use Vercel's port or fallback to 3001

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// MongoDB Configuration
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  w: 'majority',
  ssl: true
});

let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("MongoDB URI:", uri.replace(/:[^:]*@/, ':****@')); // Hide password in logs
    
    await client.connect();
    
    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
    
    // Store the database connection
    db = client.db("artihcus");
    const events = db.collection("events");
    console.log("Connected to database: artihcus, collection: events");
    
    // Create indexes for better performance
    await events.createIndex({ date: -1 });
    console.log("Created index on date field");
    
    // Test write access
    const testDoc = await events.insertOne({ 
      test: true, 
      timestamp: new Date(),
      title: "Test Event",
      description: "Test Description",
      date: new Date(),
      url: "https://test.com/image.jpg"
    });
    console.log("Write test successful:", testDoc.insertedId);
    await events.deleteOne({ _id: testDoc.insertedId });
    console.log("Delete test successful");
    
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Error stack:", error.stack);
    process.exit(1);
  }
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dnkoylvko",
  api_key: "273915118852482",
  api_secret: process.env.REACT_APP_CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors({
  origin: ['https://artihcusglobal-main.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Multer setup for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static files from images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Create a Nodemailer transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Use environment variables
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send email
const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, response: info.response };
  } catch (error) {
    throw new Error(`Error sending email: ${error.message}`);
  }
};

// Career form endpoint
app.post("/send-email/career", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const resume = req.file;

    // Validate required fields
    if (!name || !email || !phone || !resume) {
      return res.status(400).json({ error: "All fields (name, email, phone, resume) are required." });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "info@artihcus.com",
      subject: "New Career Application - Artihcus Global",
      text: `
        New Career Application Details:
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
      `,
      attachments: [
        {
          filename: resume.originalname,
          content: resume.buffer,
        },
      ],
    };

    const result = await sendEmail(mailOptions);
    res.status(200).json({ message: "Application submitted successfully.", ...result });
  } catch (error) {
    res.status(500).json({ error: `Failed to submit application: ${error.message}` });
  }
});

// Contact form endpoint
app.post("/send-email/contacthome", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      number,
      companyName,
      country,
      industry,
      services,
      referredBy,
      referredName,
      message,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !number || !companyName) {
      return res.status(400).json({ error: "Required fields are missing (firstName, lastName, email, number, companyName)." });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "info@artihcus.com",
      subject: "New Contact Form Submission - Artihcus Global",
      text: `
        New Contact Form Submission:
        
        Personal Information:
        Full Name: ${firstName} ${lastName}
        Email: ${email}
        Phone: ${number}
        
        Company Information:
        Company Name: ${companyName}
        Country: ${country || "N/A"}
        Industry: ${industry || "N/A"}
        
        Interest:
        Services Interested In: ${services || "N/A"}
        
        Referral Information:
        Referred By: ${referredBy || "N/A"}
        Referred Name: ${referredName || "N/A"}
        
        Message:
        ${message || "No message provided."}
      `,
    };

    const result = await sendEmail(mailOptions);
    res.status(200).json({
      message: "Your message has been sent successfully!",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error: `Failed to send message: ${error.message}`,
    });
  }
});

// Cloudinary signature endpoint
app.post("/api/cloudinary-signature", (req, res) => {
  try {
    const { timestamp } = req.body;
    
    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp },
      process.env.REACT_APP_CLOUDINARY_API_SECRET
    );
    
    res.json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

// Upload image endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "events",
      resource_type: "auto"
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Event endpoints
app.post("/api/events", async (req, res) => {
  try {
    console.log("Received event creation request");
    console.log("Request body:", req.body);
    
    if (!db) {
      throw new Error("Database connection not established");
    }

    const events = db.collection("events");
    
    // Validate required fields
    if (!req.body.title || !req.body.description || !req.body.date || !req.body.url) {
      console.error("Missing required fields:", {
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        url: req.body.url
      });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eventData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Attempting to create event with data:", eventData);
    const result = await events.insertOne(eventData);
    console.log("Event created successfully:", result.insertedId);
    
    res.status(201).json({ ...eventData, _id: result.insertedId });
  } catch (error) {
    console.error("Error creating event:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to create event", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    if (!db) {
      throw new Error("Database connection not established");
    }

    const events = db.collection("events");
    console.log("Fetching all events");
    const result = await events.find().sort({ date: -1 }).toArray();
    console.log(`Found ${result.length} events`);
    res.json(result);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events", details: error.message });
  }
});

app.put("/api/events/:id", async (req, res) => {
  try {
    const db = client.db("artihcus");
    const events = db.collection("events");
    
    // Validate required fields
    if (!req.body.title || !req.body.description || !req.body.date || !req.body.url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eventData = {
      ...req.body,
      updatedAt: new Date()
    };

    const result = await events.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: eventData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(result.value);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    const db = client.db("artihcus");
    const events = db.collection("events");
    
    const result = await events.deleteOne({ _id: new ObjectId(req.params.id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Connect to MongoDB after server starts
  connectToMongoDB();
});
