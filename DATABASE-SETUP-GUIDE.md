# Cyber Spin Wheel - MySQL Database Setup Guide

## Prerequisites

- WAMP (Windows Apache MySQL PHP) installed
- MySQL running in WAMP
- phpMyAdmin access (usually at <http://localhost/phpmyadmin>)

## Setup Steps

### Step 1: Access phpMyAdmin

1. Start WAMP (click the WAMP icon in system tray)
2. Right-click WAMP icon → MySQL → phpMyAdmin
3. Or go to <http://localhost/phpmyadmin> in your browser
4. Login with default credentials (usually root/no password)

### Step 2: Create the Database

**Option A: Using phpMyAdmin (Easiest)**

1. In phpMyAdmin, click on "SQL" tab
2. Copy all the SQL code from `database-setup.sql` file in this directory
3. Paste it into the SQL query box
4. Click "Go" or "Execute"
5. You should see success messages for each table created

**Option B: Using MySQL Command Line**

1. Open Command Prompt
2. Navigate to MySQL bin directory:

   ```bash
   cd "C:\wamp64\bin\mysql\mysql8.0.26\bin"
   ```

   (Replace mysql8.0.26 with your version)

3. Connect to MySQL:

   ```bash
   mysql -u root -p
   ```

   Press Enter when asked for password (default is empty)

4. Run the SQL setup:

   ```bash
   source "C:\wamp64\www\spin the wheel\spin-the-wheel\database-setup.sql"
   ```

### Step 3: Verify Database Creation

1. In phpMyAdmin, refresh the page
2. Look for `cyber_spin_wheel` database in the left panel
3. Click on it to expand and see these tables:
   - `users` - Stores registered users
   - `spin_history` - Tracks spin results
   - `wheel_sectors` - Wheel configuration
   - `campuses` - Campus lookup
   - `roles` - Role lookup
   - `genders` - Gender lookup

### Step 4: Verify Database Connection

1. Make sure WAMP MySQL is running
2. Go to <http://localhost:8000/admin.html>
3. Try registering a test user
4. If successful, the user should appear in the admin panel table
5. Check phpMyAdmin to confirm data is in the database

## Troubleshooting

### Error: "Failed to connect to MySQL"

- Check if MySQL is running in WAMP (click green WAMP icon)
- Verify MySQL port is 3306
- Check if user created test data

### Error: "Table 'cyber_spin_wheel.users' doesn't exist"

- Run the SQL setup again
- Ensure all CREATE TABLE statements executed successfully
- Check database-setup.sql has no errors

### Error: "Access denied for user 'root'@'localhost'"

- Default MySQL password in WAMP is empty
- Check db-config.php has empty password: `define('DB_PASSWORD', '');`

### Data Not Appearing

- Check if table columns match expected fields
- Verify INSERT statements worked in database-setup.sql
- Check browser console for JavaScript errors

## Database Schema

### users Table

```
- id (INT) - Primary key, auto increment
- user_id (VARCHAR) - Unique identifier for each user
- fullname (VARCHAR) - User's full name
- email (VARCHAR) - Unique email address
- gender (VARCHAR) - Male/Female/Others
- college (VARCHAR) - College name
- campus (VARCHAR) - Campus code (MCC/MMC/MBC)
- role (VARCHAR) - Student/Faculty/Non-Teaching/Others
- registered_at (TIMESTAMP) - Registration date
- updated_at (TIMESTAMP) - Last update time
```

### Access Points

- **Admin Panel**: <http://localhost:8000/admin.html>
- **Player Registration**: <http://localhost:8000> (requires registration)
- **phpMyAdmin**: <http://localhost/phpmyadmin>

## Next Steps

After database setup:

1. Test user registration in admin panel
2. Verify users appear in database
3. Test player login with registered email
4. Should be able to spin wheel after successful registration

## Backup Database

To backup your data:

1. In phpMyAdmin, click on your database
2. Click "Export" tab
3. Select "Quick" export
4. Click "Go" to download SQL file

To restore:

1. In phpMyAdmin, click "Import" tab
2. Choose your backup SQL file
3. Click "Go"
