INSERT INTO public.associates (user_id, name, email)
SELECT p.id, COALESCE(p.name, p.email, 'Asociado'), p.email
FROM public.profiles p
JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'associate'
WHERE NOT EXISTS (SELECT 1 FROM public.associates a WHERE a.user_id = p.id);