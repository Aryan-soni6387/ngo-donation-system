# 🌟 NGO Donation System (PayHere + Node.js + EJS + MongoDB)

A complete **NGO Donation System Web Application** built using **Node.js, Express, MongoDB Atlas, and EJS** with **PayHere Payment Gateway (Sandbox Mode)** integration.

This project provides:
✅ User Login/Register  
✅ Donation system with payment gateway  
✅ Admin dashboard with analytics  
✅ SuperAdmin role control (like WhatsApp group creator)  
✅ Donation tracking (SUCCESS / PENDING / FAILED)  
✅ Reports + CSV download  
✅ Beautiful modern UI (dark neon dashboard)

---

## 🚀 Features

### 👤 User Panel
- Register/Login
- Donate using PayHere Payment Gateway (Sandbox)
- Donation History page
- Status tracking: **SUCCESS / PENDING / FAILED**
- Logout functionality

### 🛡️ Admin Panel (Admin + SuperAdmin)
- Dashboard summary cards
  - Total Users
  - Total Donations
  - Total Successful Amount
- View all users
- View all donations
- Donation charts:
  - Last 7 Days Donations
  - Last 30 Days Donations
- Filter donations by status:
  - ALL / SUCCESS / PENDING / FAILED
- Export CSV reports:
  - Users CSV
  - Donations CSV

### 👑 SuperAdmin Controls (WhatsApp Creator Logic)
- Only **SuperAdmin** can:
  ✅ Make user → Admin  
  ✅ Remove admin → User  
- Admins can view data but cannot change roles.

---

## 🧑‍💻 Tech Stack

- **Frontend:** EJS, HTML, CSS (Modern Dark UI)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Authentication:** Sessions + bcrypt
- **Payment Gateway:** PayHere Sandbox
- **Charts:** Chart.js

---

## 📂 Project Structure

```bash
NGO_Donation_EJS/
│
├── models/
│   ├── User.js
│   └── Donation.js
│
├── views/
│   ├── login.ejs
│   ├── register.ejs
│   ├── user_dashboard.ejs
│   ├── donate.ejs
│   ├── donation_history.ejs
│   ├── admin_dashboard.ejs
│   ├── admin_users.ejs
│   ├── admin_donations.ejs
│   └── admin_charts.ejs
│
├── public/
│   └── style.css
│
├── server.js
├── package.json
└── README.md
⚙️ Installation & Setup
✅ 1) Clone the repository
git clone <repo-url>
cd NGO_Donation_EJS

✅ 2) Install dependencies
npm install

✅ 3) Create .env file

Create a file named .env in project root and add:

PORT=5000
SESSION_SECRET=your_secret_key

MONGO_URI=your_mongodb_connection_string

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret


⚠️ Never upload .env file to GitHub.

▶️ Run the project

Start server:

npx nodemon server.js


Open browser:
👉 http://localhost:5000

💳 PayHere Sandbox Testing

The project uses PayHere Sandbox mode

Payments can be simulated without real money.

Donation status updates based on the sandbox process.

📊 Admin Analytics & Reports
✅ Graphs available

Last 7 days donation summary

Last 30 days donation summary

✅ CSV Exports

Users CSV: /admin/export/users

Donations CSV: /admin/export/donations

✅ Roles
Role	Access
User	Donate + View own donations
Admin	View dashboard + users + donations + charts
SuperAdmin	Admin access + promote/demote users

👨‍🎓 Project By

✅ Aryan Soni
