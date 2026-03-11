-- Add day and position columns to stop table
ALTER TABLE stop
ADD COLUMN day INTEGER DEFAULT 1,
ADD COLUMN position INTEGER DEFAULT 1;

-- Create indexes for better query performance
CREATE INDEX idx_stop_day ON stop(day);
CREATE INDEX idx_stop_day_position ON stop(day, position);
