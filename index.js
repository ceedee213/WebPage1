const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');


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

app.use(session({
    secret: 'your_secret_key', 
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');

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

        req.session.user = {
           username: account.username,
            email: account.email
        };

        res.redirect('/homepage.html'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/homepage.html', (req, res) => {
    const user = req.session.user; 
    res.render('homepage', { user }); 
});

const crypto = require('crypto');
const nodemailer = require('nodemailer');


function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}


async function sendPasswordResetEmail(email, token) {
    try {
     
        const transporter = nodemailer.createTransport({
            service: 'Gmail', 
            auth: {
                user: 'your_email@gmail.com',
                pass: 'your_app_password' 
            }
        });

        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>You are receiving this email because you (or someone else) has requested the reset of the 
                password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                <a href="http://localhost:3000/reset-password.html?token=${token}">Reset Password</a>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            `

    };

   
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully');
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
}

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
    
        const account = await AccountHistory.findOne({ email });
        if (!account) {
            return res.status(404).send('No account found with this email address.');
        }

  
        const token = generateToken(); 

      
        account.token = token; 
        await account.save();

   
        await sendPasswordResetEmail(email, token);

        res.send('Password reset email sent. Please check your inbox.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Handle reset password request
app.post('/reset-password', async (req, res) => {
    const { token, password } = req.body; 

    try {
        // Check if the token is valid
        const account = await AccountHistory.findOne({ token });
        if (!account) {
            return res.status(400).send('Invalid or expired token.');
        }


        account.password = password;
        account.token = undefined; 
        await account.save();

        res.send('Password reset successfully.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port ", process.env.PORT || 3000);
});