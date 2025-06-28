-- Programs tablosuna time sütunu ekleme
ALTER TABLE programs 
ADD COLUMN time VARCHAR(10);

-- Mevcut kayıtlar için varsayılan değer (opsiyonel)
UPDATE programs 
SET time = '09:00' 
WHERE time IS NULL;

-- Sütunun nullable olmasını sağla
ALTER TABLE programs 
ALTER COLUMN time DROP NOT NULL;

-- Değişiklikleri kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'programs' 
ORDER BY ordinal_position; 