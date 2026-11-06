# A STAR FOR US ✦

반응형 커플 기념일 사이트. React + Vite + Supabase로 구성되어 있습니다.

## 포함 기능

- 별빛 배경, CSS 유성우, 초승달, 카운트다운
- 별빛 우체통: 닉네임 + 선택 질문 5개 + 필수 1주년 편지
- 우리의 추억: 사진/제목/짧은 설명/상세 내용
- 시크릿 커버: YouTube 링크 임베드
- `/admin`: Supabase Auth 로그인, 편지 조회, 추억/영상 CRUD
- Supabase RLS로 관리자 작업 제한

## 가장 쉬운 실행 방법 (Windows)

1. ZIP 파일을 먼저 압축 해제합니다.
2. 압축을 푼 `star-for-us` 폴더 안에서 `start-site.bat`을 더블클릭합니다.
3. 처음 실행할 때 필요한 패키지가 설치됩니다. 설치가 끝나면 브라우저에서 사이트가 열립니다.
4. 자동으로 열리지 않으면 주소창에 `http://localhost:5173`을 입력합니다.

주의: `index.html`만 따로 더블클릭해서 열면 안 됩니다. 반드시 프로젝트 폴더 안의 `start-site.bat`으로 실행하거나 아래 명령어를 사용해야 합니다. 실행 중에는 검은색 명령 프롬프트 창을 닫지 마세요.

## 1. Supabase 준비

1. [Supabase](https://supabase.com/)에서 프로젝트를 만듭니다.
2. **SQL Editor**에서 `supabase/schema.sql` 전체를 실행합니다.
3. **Authentication → Users → Add user**에서 관리자 이메일과 비밀번호를 생성합니다. (화면의 관리자 아이디는 이 이메일입니다.)
4. 생성한 사용자의 UUID를 복사하고 SQL Editor에서 아래 쿼리를 실행합니다.

```sql
insert into public.admin_users (user_id)
values ('여기에-auth-user-uuid')
on conflict (user_id) do nothing;
```

5. Project Settings → API에서 Project URL과 anon/public key를 복사합니다. `service_role` 키는 절대 프론트엔드나 GitHub에 넣지 마세요.

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local
```

`.env.local` 값을 채웁니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

실행:

```bash
npm run dev
```

## 3. GitHub Pages 배포

1. 이 프로젝트를 GitHub 저장소에 push 합니다.
2. 저장소 **Settings → Secrets and variables → Actions**에 아래 Repository secrets를 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 저장소 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 선택합니다.
4. `.github/workflows/deploy.yml` 워크플로가 빌드 및 배포합니다.
5. 배포 후 `/admin` 경로로 접속해 관리자 로그인합니다.

프로젝트 저장소에서도 상대 경로 빌드(`base: './'`)를 사용하도록 설정되어 있습니다. GitHub Pages에서 `/admin`을 새로고침해도 404 안내 페이지가 앱으로 되돌려 보내도록 구성했습니다.

## 운영 전 확인할 점

- 화면의 카운트다운 날짜는 `src/App.tsx` 상단 `anniversary` 값에서 변경합니다. 현재 예시값은 2026-11-10입니다.
- 홈/우체통/추억의 문구는 `src/App.tsx`의 텍스트를 수정하면 됩니다.
- 현재 샘플 추억 3개는 Supabase에 실제 추억 데이터가 없을 때의 미리보기용입니다. 실제 데이터가 등록되면 DB 데이터가 표시됩니다.
- 관리자 계정은 반드시 Supabase `admin_users` 테이블에 UUID를 등록해야 관리자 권한을 가집니다. Auth 계정만 만든다고 관리자 권한이 생기지 않습니다.
- Supabase Auth에서 공개 회원가입을 비활성화하고, 관리자 계정만 직접 생성하는 것을 권장합니다.
- YouTube 영상은 공개/일부 공개 영상만 임베드 재생될 수 있습니다. 비공개 영상은 재생되지 않을 수 있습니다.

## 기술/보안 메모

브라우저에는 anon key만 사용합니다. 편지 읽기, 추억/영상 수정, Storage 업로드는 `is_site_admin()`을 사용하는 RLS 정책에서 제한합니다. 관리자 비밀번호를 코드에 저장하지 않습니다. 우체통은 익명 제출이므로 실제 공개 운영 시 CAPTCHA/Rate Limit을 추가하는 것을 권장합니다.
