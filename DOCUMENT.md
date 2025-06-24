# Birthday & Anniversary Reminder App — Technical Deep Dive

This document provides an in-depth look at the project structure, API endpoints, and key implementation details.

---

## 📁 Project Structure

```
Birthday/
├── manage.py
├── requirements.txt
├── render.yaml
├── logs/
│   ├── error.log
│   └── app.log
├── templates/
│   ├── admin_tools.html
│   ├── home.html
│   └── base.html
├── .github/
│   └── workflows/
│       ├── media-cleanup.yml
│       ├── health-check.yml
│       └── cron.yml
├── static/
│   ├── js/
│   ├── audio/
│   ├── css/
│   └── images/
├── core/
│   ├── wsgi.py, urls.py, settings.py, asgi.py, views.py, ...
├── users/
│   ├── urls.py, views.py, models.py, forms.py, ...
│   ├── management/commands/
│   └── templates/
├── reminders/
│   ├── urls.py, views.py, models.py, forms.py, ...
│   ├── management/commands/
│   ├── templates/
│   └── static/
```

- `manage.py` — Django management script.
- `requirements.txt` — Python dependencies.
- `render.yaml` — Deployment configuration.
- `logs/` — Application and error logs.
- `templates/` — Base and admin HTML templates.
- `.github/workflows/` — CI/CD and scheduled jobs.
- `static/` — JS, CSS, images, and audio assets.


### Main Apps

- `core/` — Project settings, URLs, and entry points.
- `users/` — User management, authentication, and email templates.
- `reminders/` — Event management, reminders, media handling, and analytics.

---

## 🧩 App Modules

- **core/**: Django project settings, URLs, and entry points.
- **users/**: User authentication, registration, password reset, and profile management.
- **reminders/**: Event management, reminders, greeting cards, analytics, and admin tools.
- **static/**: JS, CSS, images, and audio for UI and greeting cards.
- **templates/**: HTML templates for all pages and emails.
- **logs/**: Application and error logs.
- **.github/**: CI/CD workflows for health checks and media cleanup.

---

## 🔗 API Endpoints

### Users

| Method | Endpoint                | Description                       |
|--------|------------------------ |-----------------------------------|
| GET    | `/login/`               | Login page                        |
| POST   | `/login/`               | Authenticate user                 |
| GET    | `/signup/`              | Registration page                 |
| POST   | `/signup/`              | Register new user                 |
| GET    | `/logout/`              | Logout user                       |
| GET    | `/password-reset/`      | Password reset form               |
| POST   | `/password-reset/`      | Send reset email                  |
| ...    | ...                     | ...                               |

### Reminders

| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| GET    | `/`                             | Home/dashboard                    |
| GET    | `/events/`                      | List all events                   |
| GET    | `/events/add/`                  | Add new event form                |
| POST   | `/events/add/`                  | Create new event                  |
| GET    | `/events/<id>/edit/`            | Edit event form                   |
| POST   | `/events/<id>/edit/`            | Update event                      |
| POST   | `/events/<id>/delete/`          | Delete event                      |
| GET    | `/cards/<id>/`                  | View greeting card                |
| GET    | `/analytics/`                   | View analytics dashboard          |
| GET    | `/admin-tools/`                 | Admin tools page                  |
| ...    | ...                             | ...                               |

### Media & Sharing

| Method | Endpoint                        | Description                       |
|--------|---------------------------------|-----------------------------------|
| POST   | `/events/<id>/upload-media/`    | Upload image/audio to event       |
| GET    | `/cards/<id>/share/`            | Share greeting card               |
| POST   | `/cards/<id>/share/`            | Send/share card                   |

---

## 🏗️ Key Implementation Details

- **Reminders:** Scheduled via cron jobs and Django management commands (`reminders/management/commands/trigger_reminders.py`).
- **Media Cleanup:** Automated with GitHub Actions and management commands.
- **Supabase:** Used for scalable media storage (see `reminders/supabase_helpers.py`).
- **Analytics:** Aggregated in `reminders/views.py` and displayed in `analytics.html`.
- **Security:** Password-protected sharing, email verification, and rate limiting.

---

## 📝 Templates & Static Files

- **Greeting Cards:** `reminders/templates/reminders/greeting_card.html` + `static/js/greeting_card.js`
- **Admin Tools:** `templates/admin_tools.html`
- **User Pages:** `users/templates/users/`



## 📚 Further Documentation

- **Django Docs:** https://docs.djangoproject.com/
- **Supabase Docs:** https://supabase.com/docs

---

## 💬 Feedback & Contact

- [**Email:**](harshitghosh7@gmail.com)
- **GitHub Issues:** [Open an issue](https://github.com/yourusername/birthday-reminder/issues)

---

*Thank you for exploring the Birthday & Anniversary