-- ============================================================================
-- FIX AND INSERT SCRIPT
-- 1. Automates "Section A" creation (so the database structure is happy).
-- 2. Inserts all subjects into Batches 47-36 correctly.
-- ============================================================================

DO $$
DECLARE
    dept_id UUID;
    batch_rec RECORD;
    sec_id UUID;
BEGIN
    -- 1. FIND DEPARTMENT (SWE)
    SELECT id INTO dept_id FROM faculties WHERE name ILIKE '%Software Engineering%' OR name = 'SWE' LIMIT 1;
    IF dept_id IS NULL THEN RAISE EXCEPTION 'Department SWE not found'; END IF;

    -- 2. LOOP THROUGH EACH BATCH (47 down to 36)
    -- We will ensure "Section A" exists, then insert subjects.
    
    FOR batch_rec IN SELECT id, name FROM batches WHERE faculty_id = dept_id AND name IN ('47','46','45','44','43','42','41','40','39','38','37','36') LOOP
        
        RAISE NOTICE 'Processing Batch %', batch_rec.name;

        -- A. GET OR CREATE SECTION 'A'
        SELECT id INTO sec_id FROM sections WHERE batch_id = batch_rec.id AND name = 'A' LIMIT 1;
        
        IF sec_id IS NULL THEN
            RAISE NOTICE 'Creating Section A for Batch %', batch_rec.name;
            INSERT INTO sections (id, batch_id, name) VALUES (gen_random_uuid(), batch_rec.id, 'A') RETURNING id INTO sec_id;
        END IF;

        -- B. INSERT SUBJECTS (If they don't already exist)
        -- Batch 47
        IF batch_rec.name = '47' THEN
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Computer Fundamentals', 'CF' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'CF');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Computer Fundamentals Lab', 'CF-LAB'
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'CF-LAB');

            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Introduction to Software Engineering', 'ISE'
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ISE');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'English Reading, Writing Skills & Public Speaking', 'ENG-101'
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ENG-101');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Bangladesh Studies', 'BDS'
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'BDS');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Math‑I: Calculus & Geometry', 'MAT-101'
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'MAT-101');
        END IF;

        -- Batch 46
        IF batch_rec.name = '46' THEN
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Structured Programming', 'SP' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SP');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Structured Programming Lab', 'SP-LAB' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SP-LAB');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Discrete Mathematics', 'DM' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DM');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Requirement Specifications & Analysis', 'SRSA' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SRSA');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Digital Electronics & Logic Design', 'DELD' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DELD');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Physics: Mechanics, Electromagnetism & Waves', 'PHY-101' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'PHY-101');
            
            INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Math‑II: Linear Algebra & Fourier Analysis', 'MAT-102' 
            WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'MAT-102');
        END IF;

        -- Batch 45
        IF batch_rec.name = '45' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Data Structure', 'DS' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DS');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Data Structure Lab', 'DS-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DS-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Development Capstone Project', 'SDCP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SDCP');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Object Oriented Concepts', 'OOC' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'OOC');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Computer Architecture', 'CA' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'CA');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Probability & Statistics in Software Engineering', 'PSSE' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'PSSE');
        END IF;

        -- Batch 44
        IF batch_rec.name = '44' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Algorithms Design & Analysis', 'ADA' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ADA');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Algorithms Design & Analysis Lab', 'ADA-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ADA-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Object Oriented Design', 'OOD' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'OOD');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Database System', 'DBS' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DBS');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Database System Lab', 'DBS-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DBS-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Operating System & System Programming', 'OSSP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'OSSP');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Operating System & System Programming Lab', 'OSSP-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'OSSP-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Principles of Accounting, Business & Economics', 'PABE' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'PABE');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Introduction to Robotics (Guided Elective I)', 'ROBO1' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ROBO1');
        END IF;

        -- Batch 43
        IF batch_rec.name = '43' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Data Communication & Computer Networking', 'DCCN' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DCCN');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Data Communication & Computer Networking Lab', 'DCCN-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DCCN-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'System Analysis & Design Capstone Project', 'SADCP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SADCP');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Theory of Computing', 'TOC' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'TOC');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Design Pattern', 'DP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DP');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Quality Assurance & Testing', 'SQAT' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SQAT');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Quality Assurance & Testing Lab', 'SQAT-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SQAT-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Business Analysis & Communication', 'BAC' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'BAC');
        END IF;

        -- Batch 42
        IF batch_rec.name = '42' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Engineering Web Application', 'SEWA' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SEWA');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Engineering Web Application Lab', 'SEWA-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SEWA-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Architecture & Design', 'SAD' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SAD');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Information System Security', 'ISS' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ISS');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Project Management & Documentation', 'SPMD' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SPMD');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Artificial Intelligence', 'AI' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'AI');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Artificial Intelligence Lab', 'AI-LAB' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'AI-LAB');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Introduction to Machine Learning', 'ML' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ML');
        END IF;

        -- Batch 41
        IF batch_rec.name = '41' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Engineering Design Capstone Project', 'SEDCP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SEDCP');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Employability 360', 'EMP360' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'EMP360');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Research Methodology & Scientific Writing', 'RMSW' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'RMSW');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Management Information System', 'MIS' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'MIS');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Data Warehouse & Data Mining', 'DWDM' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DWDM');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Final Year Project / Thesis / Internship', 'FYP' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'FYP');
        END IF;

        -- Batch 40
        IF batch_rec.name = '40' THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Guided Elective-IV', 'GE-IV' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'GE-IV');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Software Engineering Professional Ethics', 'SEPE' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'SEPE');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Numerical Analysis', 'NUM' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'NUM');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Human Computer Interaction', 'HCI' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'HCI');
        END IF;

        -- Final Batches
        IF batch_rec.name IN ('39','38','37','36') THEN
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Major Electives', 'ME-ADV' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'ME-ADV');
             INSERT INTO subjects (section_id, name, code) SELECT sec_id, 'Final Defense', 'DEFENSE' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE section_id = sec_id AND code = 'DEFENSE');
        END IF;

    END LOOP;
END $$;
