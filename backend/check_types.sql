SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('faculties', 'batches', 'sections') AND column_name = 'id';
