const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());
app.set("json spaces", 3);

// --- Logging middleware ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// --- Load MongoDB properties ---
const properties = PropertiesReader(path.join(__dirname, "dbconnection.properties"));
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db;


async function connectDB() {
    try {
        await client.connect();
        db = client.db("AdminPNLCalendar");
        console.log("Connected to MongoDB");

        app.listen(3000, () => console.log("Server running on port 3000"));
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}
connectDB();


// Get all slots
app.get("/api/slots", async (req, res) => {
    try {
        const slots = await db.collection("slots").find({})
            .sort({ date: 1, startTime: 1 })
            .toArray();
        res.json(slots);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch slots" });
    }
});

// Add a new slot
app.post("/api/slots", async (req, res) => {
    try {
        const slot = req.body;
        const result = await db.collection("slots").insertOne(slot);
        res.json({ success: true, id: result.insertedId.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create slot" });
    }
});

// Update a slot
app.put("/api/slots/:id", async (req, res) => {
    const slotId = req.params.id;
    if (!ObjectId.isValid(slotId)) return res.status(400).json({ success: false, error: "Invalid slot ID" });

    try {
        const updatedSlot = req.body;
        const result = await db.collection("slots").updateOne(
            { _id: new ObjectId(slotId) },
            { $set: updatedSlot }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, error: "Slot not found" });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to update slot" });
    }
});

// Delete a slot
app.delete("/api/slots/:id", async (req, res) => {
    const slotId = req.params.id;
    if (!ObjectId.isValid(slotId)) return res.status(400).json({ success: false, error: "Invalid slot ID" });

    try {
        const result = await db.collection("slots").deleteOne({ _id: new ObjectId(slotId) });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, error: "Slot not found" });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to delete slot" });
    }
});


app.use(express.static(path.join(__dirname, "public")));


app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});


app.use((err, req, res, next) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
});
