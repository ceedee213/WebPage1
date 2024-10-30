const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();  

const app = express();  

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('docs'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));


const accountHistorySchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const AccountHistory = mongoose.model('AccountHistory', accountHistorySchema);


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

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const account = await AccountHistory.findOne({ username });
        if (!account || account.password !== password) {
            return res.status(400).send('Invalid username or password');
        }

        console.log("Login successful");
        res.status(200).send('Login successful!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port ", process.env.PORT); 
});
