-- SQL to add HOD role to amitnayak
-- Run this in your Supabase SQL Editor

-- First, find the user ID for amitnayak
SELECT id, email, name FROM public.users 
WHERE email ILIKE '%amitnayak%' OR name ILIKE '%amitnayak%';

-- Then, view available departments
SELECT id, name FROM public.departments 
ORDER BY name;

-- Finally, add the HOD role (replace USER_ID and DEPARTMENT_ID with actual values from above)
-- Example: INSERT INTO public.user_role (user_id, role_name, depart_id) 
-- VALUES ('3cef334c-112c-4f79-b461-3484fc95ce8b', 'HOD', 'DEPARTMENT_ID_HERE');

INSERT INTO public.user_role (user_id, role_name, depart_id)
VALUES (
  (SELECT id FROM public.users WHERE email ILIKE '%amitnayak%' LIMIT 1),
  'HOD',
  (SELECT id FROM public.departments LIMIT 1)  -- Change to desired department
);
