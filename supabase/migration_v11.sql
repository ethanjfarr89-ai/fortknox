-- Migration v11: Issue reports table for user-submitted bug reports / feedback

CREATE TABLE public.issue_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  page_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Constrain status values
ALTER TABLE public.issue_reports
ADD CONSTRAINT issue_reports_status_check CHECK (status IN ('open', 'reviewed', 'resolved'));

-- Enable Row Level Security
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON public.issue_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.issue_reports
FOR SELECT USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
