-- ============================================================================
-- MIGRATION: REFACTOR SUBJECTS TO COURSE CATALOG
-- ============================================================================

-- 1. Modify TEACHER_ASSIGNMENTS
-- Needs to link to a Section AND a Course Catalog Item directly
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS course_catalog_id UUID REFERENCES course_catalog(id) ON DELETE CASCADE;
-- We can drop subject_id later, or now. Let's drop constraint first.
ALTER TABLE teacher_assignments DROP CONSTRAINT IF EXISTS teacher_assignments_subject_id_fkey;

-- 2. Modify ROUTINES
-- Needs to link to a Section AND a Course Catalog Item directly
ALTER TABLE routines ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS course_catalog_id UUID REFERENCES course_catalog(id) ON DELETE CASCADE;
ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_subject_id_fkey;

-- 3. Modify ATTENDANCE_LOGS
-- Currently references routines, so it matches the class.
-- Does it have subject_id? Check schema: No, just routine_id.
-- However, some queries might rely on it. We will check API.

-- 4. DROP SUBJECTS TABLE
DROP TABLE IF EXISTS subjects CASCADE;

-- 5. CLEANUP
-- Remove the old columns from assignments/routines
ALTER TABLE teacher_assignments DROP COLUMN IF EXISTS subject_id;
ALTER TABLE routines DROP COLUMN IF EXISTS subject_id;

-- 6. UPDATE END_SEMESTER FUNCTION
-- The logic now simplifies: We don't need to "Create Subjects".
-- New logic: Just promote batches. The "Subjects" for a batch are IMPLICITLY defined by (Batch.Current_Semester -> Course_Catalog).
-- When we need to "Assignments" or "Routines", we just pick from that pool.

CREATE OR REPLACE FUNCTION end_semester(dept_id UUID) RETURNS VOID AS $$
DECLARE
    b_rec RECORD;
    new_batch_name INT;
    new_batch_id UUID;
    sec_id UUID;
BEGIN
    -- 1. Wipe Assignments
    -- New structure: assignments link directly to sections.
    DELETE FROM teacher_assignments ta
    USING sections sec, batches b
    WHERE ta.section_id = sec.id AND sec.batch_id = b.id
    AND b.faculty_id = dept_id;

    -- 2. Promote Batches
    FOR b_rec IN SELECT * FROM batches WHERE faculty_id = dept_id AND is_graduated = FALSE ORDER BY current_semester DESC LOOP
        -- Graduate if finishing Sem 8
        IF b_rec.current_semester >= 8 THEN
            UPDATE batches SET is_graduated = TRUE WHERE id = b_rec.id;
        ELSE
            -- Increment Semester
            UPDATE batches SET current_semester = b_rec.current_semester + 1 WHERE id = b_rec.id;
            
            -- Ensure Section 'A' exists (Automated maintenance)
            SELECT id INTO sec_id FROM sections WHERE batch_id = b_rec.id AND name = 'A' LIMIT 1;
            IF sec_id IS NULL THEN
                 INSERT INTO sections (id, batch_id, name) VALUES (gen_random_uuid(), b_rec.id, 'A');
            END IF;
            
            -- NO NEED TO INSERT SUBJECTS ANYMORE!
        END IF;
    END LOOP;

    -- 3. Create NEW Batch (Sem 1)
    SELECT MAX(name::int) INTO new_batch_name FROM batches WHERE faculty_id = dept_id AND name ~ '^\d+$';
    IF new_batch_name IS NULL THEN new_batch_name := 1; ELSE new_batch_name := new_batch_name + 1; END IF;

    INSERT INTO batches (id, faculty_id, name, current_semester, is_graduated)
    VALUES (gen_random_uuid(), dept_id, new_batch_name::text, 1, FALSE)
    RETURNING id INTO new_batch_id;

    -- Create Section A
    INSERT INTO sections (id, batch_id, name) VALUES (gen_random_uuid(), new_batch_id, 'A');

    -- NO NEED TO INSERT SUBJECTS!
    
END;
$$ LANGUAGE plpgsql;
