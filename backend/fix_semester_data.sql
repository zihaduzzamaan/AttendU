-- ============================================================================
-- ONE-TIME DATA FIX: CORRECT SEMESTER MAPPING (12 SEMESTER SYSTEM)
-- User Request: Batch 47 = Semester 1. Total 12 Semesters.
-- Formula: Current Semester = 48 - Batch Name
-- Range: Sem 1 to 12.
-- ============================================================================

DO $$
DECLARE
    dept_id UUID;
BEGIN
    SELECT id INTO dept_id FROM faculties WHERE name ILIKE '%Software Engineering%' LIMIT 1;

    IF dept_id IS NOT NULL THEN
        
        -- 1. Active Batches (Sem 1 to 12)
        -- Batches 47 down to 36
        UPDATE batches 
        SET current_semester = (48 - name::int),
            is_graduated = FALSE
        WHERE faculty_id = dept_id 
          AND name ~ '^\d+$' 
          AND (48 - name::int) BETWEEN 1 AND 12;

        -- 2. Graduated Batches (>12)
        -- Batches 35 and older
        UPDATE batches 
        SET current_semester = (48 - name::int),
            is_graduated = TRUE
        WHERE faculty_id = dept_id 
          AND name ~ '^\d+$' 
          AND (48 - name::int) > 12;

        RAISE NOTICE 'Fixed semesters: Batch 47=Sem 1 ... Batch 36=Sem 12. Older graduated.';
    END IF;
END $$;
