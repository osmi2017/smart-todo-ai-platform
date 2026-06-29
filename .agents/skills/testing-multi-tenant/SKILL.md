---
name: testing-smart-todo-ai-platform
description: Test the Smart Todo AI Platform end-to-end. Use when verifying multi-tenant, RBAC, dashboard, analytics, or project management changes.
---

# Testing Smart Todo AI Platform

## Local Dev Setup

### Backend
```bash
cd backend
source venv/bin/activate
# Use SQLite for local testing (PostgreSQL is the default but may not be available)
cat > core/settings_local.py << 'EOF'
from core.settings import *  # noqa: F401, F403
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db_local.sqlite3',
    }
}
DEBUG = True
EOF

DJANGO_SETTINGS_MODULE=core.settings_local python manage.py migrate
DJANGO_SETTINGS_MODULE=core.settings_local python manage.py runserver 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
REACT_APP_API_URL=http://localhost:8000/api npm start
# Frontend runs on localhost:3000
```

## Seed Data for Multi-Tenant Testing

Use Django management shell to create test data:
```bash
DJANGO_SETTINGS_MODULE=core.settings_local python manage.py shell -c "
from api.models import User, Company, CompanyGroup, Project
from datetime import date, timedelta

# Create companies
c1 = Company.objects.create(name='Acme Corp', slug='acme-corp')
c2 = Company.objects.create(name='Globex Inc', slug='globex-inc')

# SuperAdmin (no company)
User.objects.create_user(username='superadmin', password='super123', role='superadmin')

# Admin per company
User.objects.create_user(username='acme_admin', password='admin123', role='admin', company=c1)
User.objects.create_user(username='globex_admin', password='admin123', role='admin', company=c2)

# Regular users
u1 = User.objects.create_user(username='acme_user1', password='user123', role='user', company=c1)
u2 = User.objects.create_user(username='acme_user2', password='user123', role='user', company=c1)
u3 = User.objects.create_user(username='globex_user', password='user123', role='user', company=c2)

# Groups
g1 = CompanyGroup.objects.create(name='Frontend Team', company=c1)
g1.members.add(u1)
g2 = CompanyGroup.objects.create(name='Backend Team', company=c1)
g2.members.add(u2)
g3 = CompanyGroup.objects.create(name='Engineering', company=c2)
g3.members.add(u3)

# Projects (each belongs to a group)
Project.objects.create(name='Acme Frontend App', status='in_progress', owner=u1, company=c1, group=g1, start_date=date.today(), deadline=date.today()+timedelta(days=30))
Project.objects.create(name='Acme Backend API', status='planning', owner=u2, company=c1, group=g2, start_date=date.today(), deadline=date.today()+timedelta(days=60))
Project.objects.create(name='Globex Platform', status='in_progress', owner=u3, company=c2, group=g3, start_date=date.today(), deadline=date.today()+timedelta(days=45))
"
```

## Test Accounts

| Username | Password | Role | Company | Group |
|----------|----------|------|---------|-------|
| superadmin | super123 | superadmin | None | None |
| acme_admin | admin123 | admin | Acme Corp | None |
| acme_user1 | user123 | user | Acme Corp | Frontend Team |
| acme_user2 | user123 | user | Acme Corp | Backend Team |
| globex_admin | admin123 | admin | Globex Inc | None |
| globex_user | user123 | user | Globex Inc | Engineering |

## Key Test Flows

### 1. Role-Based Sidebar Rendering
- **SuperAdmin**: Sidebar shows Entreprises, Groupes, Utilisateurs. Purple badge.
- **Admin**: Sidebar shows Groupes, Utilisateurs but NOT Entreprises. Orange badge.
- **User**: Sidebar shows NO admin menus. Green badge.

### 2. Company Isolation
- Admin user management (`/admin/users`) should only show users from their own company.
- Projects page should only show projects from the user's company (admin) or group (user).

### 3. Group-Level Project Isolation
- A regular user in "Frontend Team" should only see projects assigned to that group.
- They should NOT see projects assigned to "Backend Team" even within the same company.

### 4. Cross-Company Isolation
- Globex user should see zero Acme projects and vice versa.
- Verify via both Dashboard (Progression des projets section) and Projects page.

### 5. Company CRUD (SuperAdmin only)
- Navigate to `/admin/companies`, create a new company, verify it appears in the table.

## API Verification (curl)
You can verify backend isolation independently:
```bash
TOKEN=$(curl -s http://localhost:8000/api/auth/login/ -X POST -H "Content-Type: application/json" -d '{"username":"USERNAME","password":"PASSWORD"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s http://localhost:8000/api/projects/ -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## Logout Between Tests
Clear localStorage to fully log out between role switches:
```javascript
localStorage.clear(); window.location.href = '/login';
```

## Known Considerations
- The backend default settings use PostgreSQL. If PostgreSQL is not available, use the `settings_local.py` approach with SQLite.
- The `.env` file in backend/ may not exist by default; create one with `DEBUG=True` and `DJANGO_SECRET_KEY=test-key` if needed.
- Login response includes `company` object for non-superadmin users, which the frontend stores in localStorage.
- The `Taches` badge count in the sidebar might show stale counts from previous sessions if the DB is reused.

## Devin Secrets Needed
None required for local testing. All test accounts are created via seed script.
