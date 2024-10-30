const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


mongoose.connect('mongodb+srv://clarksulit0:Clarkduke123@cluster0.ppo2w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log("Connected to database"))
    .catch((error) => console.error("Error in connecting to database:", error));


const accountHistorySchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});


const AccountHistory = mongoose.model('AccountHistory', accountHistorySchema);


app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/login.html'); 
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

app.listen(3000, () => {
    console.log("Listening on port 3000");
});
