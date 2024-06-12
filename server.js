const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt');
const connection = require('./db/connection'); 
const session = require('express-session');
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
app.get('/', (req, res) => {
    res.render('index'); // Render the 'index' view
});
app.get('/register', (req, res) => {
    res.render('register'); // Render the 'register' view
});


// Route handler for user registration
app.post('/register', (req, res) => {
    // Extract user data from request body
    const { name, email, password } = req.body;

    // Hash the password before storing it in the database
    const hashedPassword = bcrypt.hashSync(password, 10);

    // SQL query to insert a new user into the 'users' table
    const sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

    // Execute the SQL query
    connection.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            res.status(500).send('Error registering user');
            return;
        }
        console.log('User registered successfully');
        // Redirect to login page with success message
        res.redirect('/login?registrationSuccess=true');
    });
});
app.get('/login', (req, res) => {
    res.render('login'); // Render the 'login' view
});


// Route handler for user login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Query the database to find the user with the provided email
    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            res.status(500).send('Error fetching user');
            return;
        }
        //res.json(results);
        // Check if a user with the provided email exists
        if (results.length === 0) {
            res.status(404).send('User not found');
            return;
        }

        // Verify the password
        const user = results[0];
        //res.json(user);
        if (!bcrypt.compareSync(password, user.password)) {
            res.status(401).send('Incorrect password');
            return;
        }

        // Store user information in the session
        req.session.user = user;

        // Redirect to the dashboard or send a success response
        res.redirect('/dashboard');
    });
});
// Route handler for rendering the dashboard page
app.get('/dashboard', (req, res) => {
    
    const user = req.session.user; // Retrieve user information from session data
    res.render('dashboard', { user }); // Pass the user object to the dashboard template
});
// Route handler for rendering the update page
app.get('/update', (req, res) => {
    res.render('update'); // Render the 'update' view
});

// Route handler for updating user information
// Route handler for updating user information
app.post('/update', async (req, res) => {
    // Extract updated user data from request body
    const { name, email, password } = req.body;

    // Assuming you have a userId available from the session or request
    const userId = req.session.user.id; // Assuming user ID is stored in the session
    try {
        // Hash the password before updating it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user information in the database
        const sql = `UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?`;
        await connection.query(sql, [name, email, hashedPassword, userId]);

        console.log('User information updated successfully');
        // Redirect to the index page or send a success response
        res.redirect('/');
    } catch (error) {
        console.error('Error updating user information:', error);
        res.status(500).send('Error updating user information');
    }
});
// Route handler for deleting the account
app.get('/delete', (req, res) => {
    res.render('delete'); // Render the 'delete' view
});
// Route handler for deleting user account
app.post('/delete', async (req, res) => {
    // Assuming you have a userId available from the session or request
    const userId = req.session.user.id; // Assuming user ID is stored in the session

    // Delete user's expenses first
    const deleteExpensesQuery = `DELETE FROM expenses WHERE user_id = ?`;
    connection.query(deleteExpensesQuery, [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user expenses:', err);
            res.status(500).send('Error deleting user expenses');
            return;
        }
        console.log('User expenses deleted successfully');

        // Now delete the user account from the database
        const deleteUserQuery = `DELETE FROM users WHERE id = ?`;
        connection.query(deleteUserQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error deleting user account:', err);
                res.status(500).send('Error deleting user account');
                return;
            }
            console.log('User account deleted successfully');
            // Clear user information from the session
            req.session.destroy();
            // Redirect to index.ejs after successful deletion
            res.render('index', { message: 'Account deleted successfully' });
        });
    });
});
// Route handler for adding a new expense
app.post('/expenses', async (req, res) => {
    try {
        const { category, description, amount } = req.body;
        const user_id = req.session.user.id; // Retrieve user_id from session
        const sql = `INSERT INTO expenses (user_id, category, description, amount) VALUES (?, ?, ?, ?)`;
        await connection.query(sql, [user_id, category, description, amount]);
        console.log('Expense added successfully');
        res.status(200).send('Expense added successfully');
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).send('Error adding expense');
    }
});
// Route handler for displaying all expenses
app.get('/allexpenses', (req, res) => {
    const user = req.session.user; // Retrieve user information from session data
    const user_id = user.id; // Retrieve user_id from session
    const sql = `SELECT * FROM expenses WHERE user_id = ?`;
    connection.query(sql, [user_id], (err, expenses) => {
        if (err) {
            console.error('Error fetching all expenses:', err);
            res.status(500).send('Error fetching all expenses');
            return;
        }
        res.render('allexpenses', { user, expenses }); // Pass both user and expenses data to the 'allexpenses' view
    });
});
// Route handler for filtering expenses by date (returning all expenses ordered by date)
app.post('/allexpenses/filterByDate', (req, res) => {
    const { user_id } = req.body; // Extract user_id from the request body
    const sql = `SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC`;
    connection.query(sql, [user_id], (err, filteredExpenses) => {
        if (err) {
            console.error('Error filtering expenses by date:', err);
            res.status(500).send('Error filtering expenses by date');
            return;
        }
        res.json(filteredExpenses); // Send the filtered expenses as JSON response
    });
});
// Route handler for filtering expenses by category
app.post('/allexpenses/filterByCategory', (req, res) => {
    const { user_id } = req.body; // Extract user_id from the request body
    const sql = `SELECT * FROM expenses WHERE user_id = ? ORDER BY category, created_at DESC`;
    connection.query(sql, [user_id], (err, filteredExpenses) => {
        if (err) {
            console.error('Error filtering expenses by category:', err);
            res.status(500).send('Error filtering expenses by category');
            return;
        }
        res.json(filteredExpenses); // Send the filtered expenses as JSON response
    });
});
// Route handler for deleting an expense
app.post('/deleteExpense', (req, res) => {
    const { id } = req.body;
    const sql = `DELETE FROM expenses WHERE id = ?`;
    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting expense:', err);
            res.status(500).json({ success: false, message: 'Failed to delete expense' });
        } else {
            res.status(200).json({ success: true, message: 'Expense deleted successfully' });
        }
    });
});
// Route handler for user logout
app.get('/logout', (req, res) => {
    // Destroy the session to log the user out
    req.session.destroy((err) => {
        if (err) {
            console.error('Error logging out:', err);
            res.status(500).send('Error logging out');
            return;
        }
        // Redirect to the login page or send a success response
        res.redirect('/');
    });
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


