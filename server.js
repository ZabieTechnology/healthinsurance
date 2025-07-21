const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001; // Using 3001 to match your setup

// --- Nodemailer SMTP Configuration ---
// This section configures the email service using credentials from your .env file.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true', // Use 'true' for port 465, 'false' for others
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Verify the email transporter is ready
transporter.verify(function(error, success) {
  if (error) {
    console.error("!!! Nodemailer transporter verification failed:", error);
  } else {
    console.log("✅ Nodemailer transporter is ready to send emails.");
  }
});


// --- Middleware ---
// Allows requests from any origin (useful for development)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// **UPDATED:** Serve static files from the 'dist' directory created by Vite
app.use(express.static(path.join(__dirname, 'dist')));
// Parse incoming JSON request bodies
app.use(express.json());


// --- API Endpoint for Sending Lead Notifications ---
app.post('/api/send-medical-lead', async (req, res) => {
    console.log('-> POST /api/send-medical-lead received.');
    const leadData = req.body;
    console.log('Lead data received:', JSON.stringify(leadData, null, 2));

    const recipientEmail = process.env.NOTIFICATION_EMAIL_RECIPIENT;
    const senderEmail = process.env.SMTP_USER;

    // Basic validation to ensure the server is configured and the request is valid
    if (!leadData || Object.keys(leadData).length === 0) {
        console.warn('Medical lead email: Received empty request body.');
        return res.status(400).send({ message: 'Request body is missing or empty.' });
    }
    if (!recipientEmail || !senderEmail) {
        console.error('Medical lead email: Recipient or Sender email not configured in .env file.');
        return res.status(500).send({ message: 'Email service is not configured on the server.' });
    }

    // Construct the email content
    const subject = `New Medical Insurance Lead: ${leadData.fullName || 'N/A'}`;
    const htmlBody = `
        <p>A new lead has been submitted from the Medical Insurance form:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px;">
            <tr style="background-color: #f2f2f2;"><td style="width: 30%;"><strong>Full Name:</strong></td><td>${leadData.fullName || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2;"><strong>Date of Birth:</strong></td><td>${leadData.dob || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><strong>Nationality:</strong></td><td>${leadData.nationality || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2;"><strong>Emirate of Residence:</strong></td><td>${leadData.residenceEmirate || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td><strong>Email:</strong></td><td>${leadData.email || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2;"><strong>Mobile:</strong></td><td>${leadData.mobile || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td><strong>Gender:</strong></td><td>${leadData.gender || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2;"><strong>Smoker:</strong></td><td>${leadData.smoker || 'N/A'}</td></tr>
             <tr style="background-color: #f2f2f2;"><td><strong>Submission Timestamp:</strong></td><td>${new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'long', timeZone: 'Asia/Dubai' })} (Asia/Dubai)</td></tr>
        </table>
        <p>Please follow up with the client accordingly.</p>
    `;

    const mailOptions = {
        from: `"Savington Medical Insurance" <${senderEmail}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`<- Medical lead email sent successfully: ${info.messageId} to ${recipientEmail}`);
        // Send a success response to the client
        res.status(202).send({ message: 'Lead notification accepted for delivery.' });
    } catch (error) {
        console.error('!!! Error sending medical lead notification email:', error);
        // Still send a success-like response to the client so they don't see a server error,
        // but the error is logged on the server for debugging.
        res.status(202).send({ message: 'Lead notification accepted, but email dispatch failed server-side.' });
    }
});


// --- Catch-all Route for Single-Page Application ---
// This ensures that any direct navigation to a route like /about or /contact
// will serve the main index.html file, letting React Router handle the view.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("!!! Unhandled Server Error:", err.stack || err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred on the server.'
    });
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`\n🚀 Medical Insurance Portal Server running on http://localhost:${port}`);
    console.log(`   Serving static files from: ${path.join(__dirname, 'dist')}`);
});
