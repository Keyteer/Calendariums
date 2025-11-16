CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  event_type_id text NOT NULL,
  creator_id uuid NOT NULL,
  start_datetime timestamp NOT NULL,
  end_datetime timestamp NOT NULL,
  location character varying,
  created_by_ai boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  FOREIGN KEY (creator_id) REFERENCES public.users(id),
  FOREIGN KEY (event_type_id) REFERENCES public.event_types(name)
);

ALTER TABLE public.events DROP COLUMN is_all_day;

ALTER TABLE public.events 
  ALTER COLUMN start_datetime TYPE timestamptz USING start_datetime AT TIME ZONE 'UTC',
  ALTER COLUMN end_datetime TYPE timestamptz USING end_datetime AT TIME ZONE 'UTC';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_events ON public.events;

CREATE TRIGGER set_timestamp_on_events
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  rrule TEXT NOT NULL,
  timezone VARCHAR(64) DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS recurrence_rules_event_id_idx
  ON public.recurrence_rules(event_id);

CREATE INDEX IF NOT EXISTS events_start_datetime_idx
  ON public.events(start_datetime);

  DROP TRIGGER IF EXISTS set_timestamp_on_recurrence_rules ON public.recurrence_rules;

CREATE TRIGGER set_timestamp_on_recurrence_rules
BEFORE UPDATE ON public.recurrence_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
