import pkg from "pg";
const { Pool } = pkg;

// Connect to your database using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id SERIAL PRIMARY KEY,
      userId TEXT NOT NULL,
      month INT NOT NULL,
      day INT NOT NULL,
      serverId TEXT NOT NULL
    );
  `);

  console.log("Table created");
  process.exit();
}

setup();
