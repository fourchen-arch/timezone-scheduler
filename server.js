const express = require('express');
const { Pool } = require('pg');
const { DateTime } = require('luxon');
const path = require('path');
const fs = require('fs'); // Added to read our file automatically

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// AUTO-SETUP ENGINE: Runs your init.sql automatically on startup
async function initializeDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sqlQuery);
    console.log("Database initialized and tables built perfectly!");
  } catch (err) {
    console.error("Error setting up database tables automatically:", err.message);
  }
}
initializeDatabase();

// Admin Route: Creates a new master absolute UTC schedule rule
app.post('/api/admin/create-schedule', async (req, res) => {
  const { className, utcStartDay, utcStartTime, utcEndDay, utcEndTime } = req.body;
  try {
    await pool.query(
      `INSERT INTO schedules (class_name, utc_start_day, utc_start_time, utc_end_day, utc_end_time) 
       VALUES ($1, $2, $3, $4, $5)`,
      [className, utcStartDay, utcStartTime, utcEndDay, utcEndTime]
    );
    res.json({ success: true, message: "Master UTC Schedule created successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Route: Simulates updating a student's residential profile location
app.post('/api/admin/update-student-zone', async (req, res) => {
  const { timezone } = req.body;
  try {
    await pool.query(
      `UPDATE students SET residential_timezone = $1 WHERE student_id = 'STU-001'`,
      [timezone]
    );
    res.json({ success: true, message: `Student address shifted to ${timezone}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Route: Dynamic offset logic loop executing calculations
app.get('/api/student/timetable', async (req, res) => {
  try {
    const studentRes = await pool.query("SELECT * FROM students WHERE student_id = 'STU-001'");
    if (studentRes.rows.length === 0) {
      return res.json({ studentName: "No Student Found", currentZone: "UTC", timetable: [] });
    }
    const student = studentRes.rows[0];
    const targetZone = student.residential_timezone;

    const schedulesRes = await pool.query("SELECT * FROM schedules");
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const localizedTimetable = schedulesRes.rows.map(item => {
      const computeLocal = (utcDayName, utcTimeStr) => {
        let anchor = DateTime.fromISO(`2026-01-01T${utcTimeStr}`, { zone: 'utc' });
        const baseDayIdx = daysOfWeek.indexOf(utcDayName);
        const anchorDayIdx = daysOfWeek.indexOf(anchor.toFormat('cccc'));
        const daysToShift = baseDayIdx - anchorDayIdx;
        anchor = anchor.plus({ days: daysToShift });

        const localized = anchor.setZone(targetZone);
        return {
          day: localized.toFormat('cccc'),
          timeStr: localized.toFormat('hh:mm a')
        };
      };

      const startLocal = computeLocal(item.utc_start_day, item.utc_start_time);
      const endLocal = computeLocal(item.utc_end_day, item.utc_end_time);
      const crossesMidnight = startLocal.day !== endLocal.day;

      return {
        id: item.id,
        className: item.class_name,
        localStartDay: startLocal.day,
        localStartTime: startLocal.timeStr,
        localEndDay: endLocal.day,
        localEndTime: endLocal.timeStr,
        isOvernight: crossesMidnight
      };
    });

    res.json({ studentName: student.full_name, currentZone: targetZone, timetable: localizedTimetable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing successfully on port ${PORT}`));
