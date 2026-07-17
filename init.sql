-- Clean setup for our mock system environment
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
    student_id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    residential_timezone VARCHAR(50) NOT NULL
);

CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    utc_start_day VARCHAR(20) NOT NULL, -- e.g., 'Monday'
    utc_start_time TIME NOT NULL,       -- e.g., '22:00:00'
    utc_end_day VARCHAR(20) NOT NULL,   -- e.g., 'Tuesday'
    utc_end_time TIME NOT NULL          -- e.g., '01:00:00'
);

-- Insert our default testing profile (A simulated student account)
INSERT INTO students (student_id, full_name, residential_timezone) 
VALUES ('STU-001', 'Test Student Persona', 'Australia/Hobart');
