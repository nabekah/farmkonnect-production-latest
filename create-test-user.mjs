import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection config
const dbUrl = new URL(process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/farmkonnect');
const connectionConfig = {
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
};

async function createTestUser() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Connected to database');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123456', salt);

    // Check if user already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@farmkonnect.com']
    );

    if (existing.length > 0) {
      console.log('✓ Admin user already exists, updating...');
      // Update existing user
      await connection.execute(
        `UPDATE users SET 
          emailVerified = true,
          approvalStatus = 'approved',
          accountStatus = 'active',
          role = 'admin',
          passwordHash = ?,
          lastSignedIn = NOW()
        WHERE email = ?`,
        [passwordHash, 'admin@farmkonnect.com']
      );
      console.log('✓ Admin user updated successfully');
    } else {
      console.log('✓ Creating new admin user...');
      // Create new user
      await connection.execute(
        `INSERT INTO users (
          username,
          email,
          passwordHash,
          name,
          role,
          loginMethod,
          emailVerified,
          approvalStatus,
          accountStatus,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          'admin',
          'admin@farmkonnect.com',
          passwordHash,
          'Admin User',
          'admin',
          'local',
          true,  // emailVerified
          'approved',  // approvalStatus
          'active'  // accountStatus
        ]
      );
      console.log('✓ Admin user created successfully');
    }

    // Verify the user
    const [user] = await connection.execute(
      'SELECT id, email, emailVerified, approvalStatus, accountStatus, role FROM users WHERE email = ?',
      ['admin@farmkonnect.com']
    );

    if (user.length > 0) {
      const u = user[0];
      console.log('\n✓ User Details:');
      console.log(`  Email: ${u.email}`);
      console.log(`  Email Verified: ${u.emailVerified}`);
      console.log(`  Approval Status: ${u.approvalStatus}`);
      console.log(`  Account Status: ${u.accountStatus}`);
      console.log(`  Role: ${u.role}`);
      console.log('\n✓ Login credentials:');
      console.log(`  Email: admin@farmkonnect.com`);
      console.log(`  Password: Admin@123456`);
    }

    await connection.end();
    console.log('\n✓ Test user setup complete!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
