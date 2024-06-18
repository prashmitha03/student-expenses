require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const connectDB = require("./db/connection");
const User = require("./models/User");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: "amulya",
    resave: false,
    saveUninitialized: true,
  })
);

connectDB();

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, phone_number, password } = req.body;
  try {
    const user = new User({ name, email, phone_number, password });
    await user.save();
    res.redirect("/login?registrationSuccess=true");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Error registering user");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("Incorrect email or password");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send("Incorrect email or password");
    }
    req.session.user = user;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Error logging in");
  }
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const user = req.session.user;
  res.render("dashboard", { user });
});

app.get("/addExpense", (req, res) => {
  res.render("addExpense");
});


app.get("/update", (req, res) => {
  res.render("update");
});

app.post("/update", async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    user.name = name;
    user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    res.redirect("/");
  } catch (error) {
    console.error("Error updating user information:", error);
    res.status(500).send("Error updating user information");
  }
});


app.get("/delete", (req, res) => {
  res.render("delete");
});


app.post("/delete", async (req, res) => {
  const userId = req.session.user._id;
  try {
    await User.findByIdAndDelete(userId);
    req.session.destroy();
    res.render("index", { message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).send("Error deleting user account");
  }
});



app.post("/expenses", async (req, res) => {
  const { category, description, amount, date } = req.body;
  const userId = req.session.user._id;

  // Log the entire req.body to debug
  console.log("Received req.body:", req.body);

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Validate and parse the date
    const parsedDate = new Date(date);
    console.log("Parsed Date:", parsedDate);
    if (isNaN(parsedDate)) {
      return res.status(400).send("Invalid date format");
    }

    const expense = { category, description, amount, created_at: parsedDate };
    user.expenses.push(expense);
    await user.save();
    res.status(200).send("Expense added successfully");
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).send("Error adding expense");
  }
});

app.post("/allexpenses/filterByDateRange", async (req, res) => {
  const { fromDate, toDate } = req.body;
  const userId = req.session.user._id;

  if (!fromDate || !toDate) {
    return res.status(400).send("Invalid date range provided");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    // Ensure 'to' date includes the entire day
    to.setHours(23, 59, 59, 999);

    const filteredExpenses = user.expenses.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= from && expenseDate <= to;
    });

    res.json(filteredExpenses);
  } catch (error) {
    console.error("Error filtering expenses by date range:", error);
    res.status(500).send("Error filtering expenses by date range");
  }
});



app.get("/allexpenses", async (req, res) => {
  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("allexpenses", { user, expenses: user.expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).send("Error fetching expenses");
  }
});

app.post("/allexpenses/filterByDate", async (req, res) => {
  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const filteredExpenses = user.expenses.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(filteredExpenses);
  } catch (error) {
    console.error("Error filtering expenses by date:", error);
    res.status(500).send("Error filtering expenses by date");
  }
});

app.post("/allexpenses/filterByCategory", async (req, res) => {
  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const filteredExpenses = user.expenses.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(filteredExpenses);
  } catch (error) {
    console.error("Error filtering expenses by category:", error);
    res.status(500).send("Error filtering expenses by category");
  }
});

app.post("/allexpenses/filterByAmount", async (req, res) => {
  const userId = req.session.user._id;
  const { sortOrder } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const sortedExpenses = user.expenses.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.amount - b.amount;
      } else {
        return b.amount - a.amount;
      }
    });
    res.json(sortedExpenses);
  } catch (error) {
    console.error("Error filtering expenses by amount:", error);
    res.status(500).send("Error filtering expenses by amount");
  }
});

app.post("/deleteExpense", async (req, res) => {
  const { id } = req.body;
  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    user.expenses = user.expenses.filter(
      (expense) => expense._id.toString() !== id
    );
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete expense" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});