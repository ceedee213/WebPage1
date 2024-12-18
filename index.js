const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); 

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
    password: { type: String, required: true },
});
const AccountHistory = mongoose.model('AccountHistory', accountHistorySchema);

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/docs/login.html');
});

app.post('/sign_up', async (req, res) => {
    try {
        
        console.log('Request Body:', req.body);


        const { username, email, password, reEnterpassword } = req.body;

        
        if (!username || !email || !password || !reEnterpassword) {
            return res.status(400).send('All fields are required.');
        }

       
        if (password !== reEnterpassword) {
            return res.status(400).send('Passwords do not match.');
        }

       
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

     
        res.status(200).send('Registration successful!');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An internal server error occurred.');
    }
});

function validateRegistration(req, res, next) {
    const { username, email, password, reEnterpassword } = req.body;
    if (!username || !email || !password || !reEnterpassword) {
        return res.status(400).send('All fields are required.');
    }
    if (password !== reEnterpassword) {
        return res.status(400).send('Passwords do not match.');
    }
    next();
}

app.post('/sign_up', validateRegistration, async (req, res) => {

});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const account = await AccountHistory.findOne({ username });
        if (!account) {
            return res.redirect('/notconnected.html');
        }

        
        if (password !== account.password) {
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
    if (req.query.refresh === 'true') {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache'); 
        res.header('Expires', '0'); 
    }
    const user = req.session.user;
    res.render('homepage', { user });
});

app.get('/homepage.html', (req, res) => {
    const user = req.session.user;
    res.render('homepage', { user });
});

app.post('/reset-password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    try {

        const account = await AccountHistory.findOne({ username });
        if (!account) {
            return res.status(404).send('User not found.');
        }

        if (oldPassword !== account.password) {
            return res.status(400).send('Old password is incorrect.');
        }

      
        account.password = newPassword;
        await account.save();

        res.status(200).send('Password has been successfully reset.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port', process.env.PORT || 3000);
});