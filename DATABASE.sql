-- SQL SETUP UNTUK SUPABASE --
-- Jalankan kode ini di SQL Editor Supabase Anda --

-- 1. Tabel Users (Profile tambahan)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text check (role in ('admin', 'guru', 'siswa')) not null default 'siswa',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel Students (Khusus metadata siswa)
create table if not exists public.students (
  id uuid references public.users on delete cascade primary key,
  nis text unique,
  class text
);

-- 3. Tabel Questions (Bank Soal)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  type text check (type in ('pilihan_ganda', 'esai')) not null default 'pilihan_ganda',
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text, -- Untuk PG: a/b/c/d, Untuk Esai: kunci jawaban/keyword
  created_by uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabel Exams (Jadwal Ujian)
create table if not exists public.exams (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null, -- mapel
  duration integer not null, -- dalam menit
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status text check (status in ('aktif', 'nonaktif')) default 'aktif',
  is_active boolean default true, -- legacy support
  created_by uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrasi: Tambah kolom role_creator jika belum ada
do $$ 
begin
  if not exists (select 1 from INFORMATION_SCHEMA.COLUMNS where table_name = 'exams' and column_name = 'role_creator') then
    alter table public.exams add column role_creator text check (role_creator in ('admin', 'guru')) default 'admin';
  end if;
end $$;

-- 5. Tabel Exam Questions (Relasi Ujian & Soal)
create table if not exists public.exam_questions (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references public.exams(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade
);

-- 6. Tabel Answers (Log Jawaban Siswa)
create table if not exists public.answers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  answer text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabel Results (Nilai Akhir)
create table if not exists public.results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  correct_answers integer not null,
  student_answers jsonb default '[]'::jsonb, -- Detail jawaban tiap soal
  feedback text, -- Pembahasan dari guru
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE RLS --
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.answers enable row level security;
alter table public.results enable row level security;

-- DROP ALL EXISTING POLICIES BEFORE RECREATING (To avoid "already exists" errors) --
do $$ 
declare
    pol record;
begin
    for pol in (select policyname, tablename from pg_policies where schemaname = 'public') loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end $$;

-- POLICIES --
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- 8. Policies for Questions
create policy "Questions viewable by everyone" on public.questions for select using (true);
create policy "Staff can manage questions" on public.questions for all using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru')));

-- 9. Policies for Exams
-- Admin can do everything
create policy "Admin manages all exams" on public.exams for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- Guru manages their own
create policy "Guru manage their own exams" on public.exams for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'guru')
  and created_by = auth.uid()
) with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'guru')
  and created_by = auth.uid()
);
-- Siswa can see all exams (metadata like title/subject) to ensure results page works
create policy "Exams select policy for authenticated" on public.exams for select to authenticated using (true);

create policy "Exam questions viewable by everyone" on public.exam_questions for select using (true);
create policy "Staff can manage exam questions" on public.exam_questions for all using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru')));

-- 10. Policies for Answers
create policy "Answers insert policy" on public.answers for insert with check (
  auth.uid() = user_id
);

create policy "Answers select policy" on public.answers for select using (
  auth.uid() = user_id or 
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru'))
);

-- 11. Policies for Results
create policy "Results insert policy" on public.results for insert with check (
  auth.uid() = user_id
);

create policy "Results select policy" on public.results for select using (
  auth.uid() = user_id or 
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru'))
);

create policy "Results update policy" on public.results for update using (
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru'))
) with check (
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'guru'))
);

create policy "Results delete policy" on public.results for delete using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- TRIGGER SETUP --
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New User'), coalesce(new.raw_user_meta_data->>'role', 'siswa'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
