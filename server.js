require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 3000;
 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
    secret: 'amulya',
    resave: false,
    saveUninitialized: true
}));
 
const readData = () => {
    const data = fs.readFileSync('metadata.json', 'utf8');
    return JSON.parse(data);
};
 
const writeData = (data) => {
    fs.writeFileSync('metadata.json', JSON.stringify(data, null, 2), 'utf8');
};
 
app.get('/', (req, res) => {
    res.render('index');
});
 
app.get('/register', (req, res) => {
    res.render('register');
});
 
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const data = readData();
    if (data.users.some(user => user.email === email)) {
        return res.status(400).send('User already exists');
    }
 
    const newUser = { id: Date.now(), name, email, password: hashedPassword };
    data.users.push(newUser);
    writeData(data);
 
    res.redirect('/login?registrationSuccess=true');
});
 
app.get('/login', (req, res) => {
    res.render('login');
});
 
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
 
    const data = readData();
    const user = data.users.find(user => user.email === email);
 
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Incorrect email or password');
    }
 
    req.session.user = user;
    res.redirect('/dashboard');
});
 
app.get('/dashboard', (req, res) => {
    const user = req.session.user;
    res.render('dashboard', { user });
});
 
app.get('/update', (req, res) => {
    res.render('update');
});
 
app.post('/update', async (req, res) => {
    const { name, email, password } = req.body;
    const userId = req.session.user.id;
    const data = readData();
    const user = data.users.find(user => user.id === userId);
 
    if (!user) {
        return res.status(404).send('User not found');
    }
 
    user.name = name;
    user.email = email;
    user.password = await bcrypt.hash(password, 10);
    writeData(data);
 
    res.redirect('/');
});
 
app.get('/delete', (req, res) => {
    res.render('delete');
});
 
app.post('/delete', (req, res) => {
    const userId = req.session.user.id;
    const data = readData();
    data.expenses = data.expenses.filter(expense => expense.user_id !== userId);
    data.users = data.users.filter(user => user.id !== userId);
    writeData(data);
 
    req.session.destroy();
    res.render('index', { message: 'Account deleted successfully' });
});
 
app.post('/expenses', (req, res) => {
    const { category, description, amount } = req.body;
    const user_id = req.session.user.id;
    const data = readData();
 
    const newExpense = { id: Date.now(), user_id, category, description, amount, created_at: new Date() };
    data.expenses.push(newExpense);
    writeData(data);
 
    res.status(200).send('Expense added successfully');
});
 
app.get('/allexpenses', (req, res) => {
    const user = req.session.user;
    const data = readData();
    const userExpenses = data.expenses.filter(expense => expense.user_id === user.id);
    res.render('allexpenses', { user, expenses: userExpenses });
});
 
app.post('/allexpenses/filterByDate', (req, res) => {
    const { user_id } = req.body;
    const data = readData();
    const filteredExpenses = data.expenses.filter(expense => expense.user_id === user_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(filteredExpenses);
});
 
app.post('/allexpenses/filterByCategory', (req, res) => {
    const { user_id } = req.body;
    const data = readData();
    const filteredExpenses = data.expenses.filter(expense => expense.user_id === user_id).sort((a, b) => a.category.localeCompare(b.category) || new Date(b.created_at) - new Date(a.created_at));
    res.json(filteredExpenses);
});
 
app.post('/deleteExpense', (req, res) => {
    const { id } = req.body;
    const data = readData();
    data.expenses = data.expenses.filter(expense => expense.id !== id);
    writeData(data);
 
    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
});
 
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});
 
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});