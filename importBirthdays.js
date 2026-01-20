import fs from "fs";
import pkg from "pg";
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Read birthdays.json
const birthdays = JSON.parse(fs.readFileSync("./birthdays.json", "utf-8"));

async function run() {
  for (const b of birthdays) {
    await pool.query(
      "INSERT INTO birthdays (userId, month, day, serverId) VALUES ($1, $2, $3, $4)",
      [b.userId, b.month, b.day, b.serverId]
    );
  }

  console.log("Birthdays imported");
  process.exit();
}

run();
