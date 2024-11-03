const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');   
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // Require body-parser

require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('docs'));

mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, 
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

const accountHistorySchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const AccountHistory = mongoose.model('AccountHistory', accountHistorySchema);

app.get('/forgot-password.html', (req, res) => {
    res.sendFile(__dirname + '/forgot-password.html');
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/docs/login.html');
});

app.post('/sign_up', async (req, res) => {
    const { username, email, password, reEnterpassword } = req.body;

    try {
        const existingUsername = await AccountHistory.findOne({ username });
        if (existingUsername) {
            return res.status(400).send('This username is already taken.');
        }

        const existingEmail = await AccountHistory.findOne({ email });
        if (existingEmail) {
            return res.status(400).send('An account with this email already exists.');
        }

        const newAccount = new AccountHistory({ username, email, password });
        await newAccount.save();

        console.log("Record Inserted Successfully");
        res.status(200).send('Registration successful!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const account = await AccountHistory.findOne({ username });
        if (!account || account.password !== password) {

            return res.redirect('/notconnected.html'); 
        }
        console.log("Login successful");

        res.redirect('/homepage.html'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
    });
    const sendPasswordResetEmail = async (email, resetLink) => {
        let transporter = nodemailer.createTransport({
            // Configure your email provider (e.g., Gmail, SendGrid, Mailgun)
            service: 'gmail', // e.g., 'gmail'
            auth: {
                user: 'your_email@gmail.com', // Your email address
                pass: 'your_email_password'  // Your email password or App Password
            }
        });
    
        let info = await transporter.sendMail({
            from: '"Your App Name" <your_email@gmail.com>',
            to: email,
            subject: 'Password Reset',
            html: `Click this link to reset your password: <a href="${resetLink}">${resetLink}</a>`
        });
    
        console.log('Message sent: %s', info.messageId);
    };
    
    app.post('/forgot-password', async (req, res) => {
        try {
            const email = req.body.email;
            const token = crypto.randomBytes(20).toString('hex');
    
            // Use AccountHistory model instead of db.users
            const user = await AccountHistory.findOne({ email: email });
            if (!user) {
                return res.status(404).send('User not found');
            }
    
            user.resetToken = token;
            user.resetTokenExpires = Date.now() + 3600000; 
            await user.save();
    
            const resetLink = `https://webpage1-c5jl.onrender.com/reset-password.html?token=${token}`; // Update with your actual domain
            await sendPasswordResetEmail(email, resetLink);
    
            res.send('Password reset email sent!');
        } catch (err) {
            console.error('Error in forgot password:', err);
            res.status(500).send('Error sending reset email');
        }
    });
    
    app.post('/reset-password', async (req, res) => {
        try {
            const token = req.body.token;
            const newPassword = req.body.password;
    
            // Use AccountHistory model instead of db.users
            const user = await AccountHistory.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });
            if (!user) {
                return res.status(400).send('Invalid or expired token');
            }
    
            const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
            user.password = hashedPassword;
            user.resetToken   
     = undefined;
            user.resetTokenExpires = undefined;
            await user.save();
    
            res.send('Password reset successful!');
        } catch (err) {
            console.error('Error resetting password:', err);
            res.status(500).send('Error resetting password');
        } 
    });

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port ", process.env.PORT || 3000);
});