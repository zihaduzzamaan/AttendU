-- ============================================================================
-- SEMESTER AUTOMATION: SCHEMA & LOGIC (FIXED UUID TYPES)
-- ============================================================================

-- A. CREATE COURSE CATALOG
CREATE TABLE IF NOT EXISTS course_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE, -- Fixed: UUID
    semester_level INT NOT NULL,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    is_lab BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- B. UPDATE BATCHES TABLE
ALTER TABLE batches ADD COLUMN IF NOT EXISTS current_semester INT DEFAULT 1;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN DEFAULT FALSE;

-- C. POPULATE CATALOG & INIT DATA (Software Engineering)
DO $$
DECLARE
    dept_id UUID; -- Fixed: UUID
BEGIN
    SELECT id INTO dept_id FROM faculties WHERE name ILIKE '%Software Engineering%' LIMIT 1;

    IF dept_id IS NOT NULL THEN
        -- 1. Clear existing catalog for this dept to avoid duplicates if re-run
        DELETE FROM course_catalog WHERE faculty_id = dept_id;

        -- Sem 1
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 1, 'Computer Fundamentals', 'CF'),
        (dept_id, 1, 'Computer Fundamentals Lab', 'CF-LAB'),
        (dept_id, 1, 'Introduction to Software Engineering', 'ISE'),
        (dept_id, 1, 'English Reading, Writing Skills & Public Speaking', 'ENG-101'),
        (dept_id, 1, 'Bangladesh Studies', 'BDS'),
        (dept_id, 1, 'Math‑I: Calculus & Geometry', 'MAT-101');

        -- Sem 2
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 2, 'Structured Programming', 'SP'),
        (dept_id, 2, 'Structured Programming Lab', 'SP-LAB'),
        (dept_id, 2, 'Discrete Mathematics', 'DM'),
        (dept_id, 2, 'Software Requirement Specifications & Analysis', 'SRSA'),
        (dept_id, 2, 'Digital Electronics & Logic Design', 'DELD'),
        (dept_id, 2, 'Physics: Mechanics, Electromagnetism & Waves', 'PHY-101'),
        (dept_id, 2, 'Math‑II: Linear Algebra & Fourier Analysis', 'MAT-102');

        -- Sem 3
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 3, 'Data Structure', 'DS'),
        (dept_id, 3, 'Data Structure Lab', 'DS-LAB'),
        (dept_id, 3, 'Software Development Capstone Project', 'SDCP'),
        (dept_id, 3, 'Object Oriented Concepts', 'OOC'),
        (dept_id, 3, 'Computer Architecture', 'CA'),
        (dept_id, 3, 'Probability & Statistics in Software Engineering', 'PSSE');

        -- Sem 4
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 4, 'Algorithms Design & Analysis', 'ADA'),
        (dept_id, 4, 'Algorithms Design & Analysis Lab', 'ADA-LAB'),
        (dept_id, 4, 'Object Oriented Design', 'OOD'),
        (dept_id, 4, 'Database System', 'DBS'),
        (dept_id, 4, 'Database System Lab', 'DBS-LAB'),
        (dept_id, 4, 'Operating System & System Programming', 'OSSP'),
        (dept_id, 4, 'Operating System & System Programming Lab', 'OSSP-LAB'),
        (dept_id, 4, 'Principles of Accounting, Business & Economics', 'PABE'),
        (dept_id, 4, 'Introduction to Robotics (Guided Elective I)', 'ROBO1');

        -- Sem 5
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 5, 'Data Communication & Computer Networking', 'DCCN'),
        (dept_id, 5, 'Data Communication & Computer Networking Lab', 'DCCN-LAB'),
        (dept_id, 5, 'System Analysis & Design Capstone Project', 'SADCP'),
        (dept_id, 5, 'Theory of Computing', 'TOC'),
        (dept_id, 5, 'Design Pattern', 'DP'),
        (dept_id, 5, 'Software Quality Assurance & Testing', 'SQAT'),
        (dept_id, 5, 'Software Quality Assurance & Testing Lab', 'SQAT-LAB'),
        (dept_id, 5, 'Business Analysis & Communication', 'BAC');

        -- Sem 6
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 6, 'Software Engineering Web Application', 'SEWA'),
        (dept_id, 6, 'Software Engineering Web Application Lab', 'SEWA-LAB'),
        (dept_id, 6, 'Software Architecture & Design', 'SAD'),
        (dept_id, 6, 'Information System Security', 'ISS'),
        (dept_id, 6, 'Software Project Management & Documentation', 'SPMD'),
        (dept_id, 6, 'Artificial Intelligence', 'AI'),
        (dept_id, 6, 'Artificial Intelligence Lab', 'AI-LAB'),
        (dept_id, 6, 'Introduction to Machine Learning', 'ML');

        -- Sem 7
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 7, 'Software Engineering Design Capstone Project', 'SEDCP'),
        (dept_id, 7, 'Employability 360', 'EMP360'),
        (dept_id, 7, 'Research Methodology & Scientific Writing', 'RMSW'),
        (dept_id, 7, 'Management Information System', 'MIS'),
        (dept_id, 7, 'Data Warehouse & Data Mining', 'DWDM'),
        (dept_id, 7, 'Final Year Project / Thesis / Internship', 'FYP');

        -- Sem 8
        INSERT INTO course_catalog (faculty_id, semester_level, subject_name, subject_code) VALUES
        (dept_id, 8, 'Guided Elective-IV', 'GE-IV'),
        (dept_id, 8, 'Software Engineering Professional Ethics', 'SEPE'),
        (dept_id, 8, 'Numerical Analysis', 'NUM'),
        (dept_id, 8, 'Human Computer Interaction', 'HCI');
        
        -- Sem 9 to 12 (Placeholders if not provided, assuming user will add later via UI or wants 12 sems logic enabled)
        -- We will just ensure logic supports up to 12.

        -- 2. Update Existing Batches Semesters based on logic (47=Sem 1, 36=Sem 12...)
        -- Formula: Semester = (48 - BatchNumber)
        -- Logic updated to 12 semesters
        UPDATE batches 
        SET current_semester = (48 - name::int) 
        WHERE faculty_id = dept_id AND name ~ '^\d+$' AND (48 - name::int) BETWEEN 1 AND 12;

        UPDATE batches 
        SET is_graduated = TRUE 
        WHERE faculty_id = dept_id AND name ~ '^\d+$' AND (48 - name::int) > 12;
        
        RAISE NOTICE 'Course Data & Batch Info Initialized for SWE (12 Sems)';
    END IF;
END $$;


-- D. CREATE END SEMESTER FUNCTION
-- This function will be called by the Admin Button
CREATE OR REPLACE FUNCTION end_semester(dept_id UUID) RETURNS VOID AS $$ -- Fixed: UUID
DECLARE
    b_rec RECORD;
    new_batch_name INT;
    new_batch_id UUID; -- Fixed: UUID
    sec_id UUID;
BEGIN
    -- 1. Wipe Assignments
    DELETE FROM teacher_assignments ta
    USING subjects s, sections sec, batches b
    WHERE ta.subject_id = s.id AND s.section_id = sec.id AND sec.batch_id = b.id
    AND b.faculty_id = dept_id;

    -- 2. Promote Batches
    FOR b_rec IN SELECT * FROM batches WHERE faculty_id = dept_id AND is_graduated = FALSE ORDER BY current_semester DESC LOOP
        
        -- Graduate if finishing Sem 12 (CHANGED FROM 8)
        IF b_rec.current_semester >= 12 THEN
            UPDATE batches SET is_graduated = TRUE WHERE id = b_rec.id;
        ELSE
            -- Increment Semester
            UPDATE batches SET current_semester = b_rec.current_semester + 1 WHERE id = b_rec.id;
            
            -- Insert NEXT Semester Subjects (Legacy support if needed, but we are moving to Catalog)
            -- For now, we still maintain SUBJECTS table if the old code relies on it, 
            -- BUT we should probably stop filling it if we are fully migrated?
            -- The prompt implies we are migrating "from subjects table to course_catalog".
            -- So `end_semester` should probably NOT insert into `subjects`.
            -- However, keeping it safe for compatibility if frontend still reads `subjects` table somewhere.
            -- ... Wait, the frontend `api.ts` was refactored to read CATALOG. 
            -- The "Subjects" tab reads CATALOG.
            -- Teachers read CATALOG.
            -- So we do NOT need to insert into `subjects` anymore in this function!
            -- I will comment out the subject insertion to be clean.
            
            -- Ensure Section 'A' exists for continuity
            SELECT id INTO sec_id FROM sections WHERE batch_id = b_rec.id AND name = 'A' LIMIT 1;
            IF sec_id IS NULL THEN
                 INSERT INTO sections (id, batch_id, name) VALUES (gen_random_uuid(), b_rec.id, 'A') RETURNING id INTO sec_id;
            END IF;

        END IF;
    END LOOP;

    -- 3. Create NEW Batch (Sem 1)
    -- Find max batch name (numerical)
    SELECT MAX(name::int) INTO new_batch_name FROM batches WHERE faculty_id = dept_id AND name ~ '^\d+$';
    IF new_batch_name IS NULL THEN new_batch_name := 1; ELSE new_batch_name := new_batch_name + 1; END IF;

    INSERT INTO batches (id, faculty_id, name, current_semester, is_graduated) 
    VALUES (gen_random_uuid(), dept_id, new_batch_name::text, 1, FALSE) 
    RETURNING id INTO new_batch_id;

    -- Create Section A
    INSERT INTO sections (id, batch_id, name) VALUES (gen_random_uuid(), new_batch_id, 'A') RETURNING id INTO sec_id;

    -- Note: No longer inserting into `subjects` table. The Course Catalog is the source of truth.
    
END;
$$ LANGUAGE plpgsql;
