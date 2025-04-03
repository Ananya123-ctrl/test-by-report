require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

let lastProcessedTime = 0;

app.post("/send-sms", async (req, res) => {
    const currentTime = Date.now();

    // Rate limit: Allow only one request per 15 seconds
    if (currentTime - lastProcessedTime < 15000) {
        return res.status(429).json({ success: false, message: "Too many requests. Try again later." });
    }

    lastProcessedTime = currentTime;

    const { numbers } = req.body;

    // Validate input
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid 'numbers' field. It should be a non-empty array." });
    }

    // Ensure proper number format
    const formattedNumbers = numbers.map(num => num.startsWith("+") ? num : `+91${num}`);

    console.log("📲 Sender Number:", formattedNumbers[0]);
    console.log("🚀 Sending WhatsApp Alert via Twilio to:", formattedNumbers);

    try {
        const messages = await Promise.all(
            formattedNumbers.map(async (num) => {
                const message = await client.messages.create({
                    from: "whatsapp:+14155238886",
                    to: `whatsapp:${num}`,
                    body: "Wake Up! Drive Safe"
                });
                return message.sid;
            })
        );

        console.log("✅ Messages Sent:", messages);
        res.status(200).json({ success: true, messageSids: messages });
    } catch (error) {
        console.error("❌ Error sending WhatsApp message:", error);
        res.status(500).json({ success: false, error: "Failed to send WhatsApp messages." });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
