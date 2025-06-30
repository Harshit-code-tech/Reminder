# 🎉 Reminder App

Welcome! This is a modern Django web app to help you remember and celebrate birthdays, anniversaries, and special events. It’s designed for ease of use, beautiful sharing, and powerful reminders.

---

## 🚀 Demo

- **Live Demo:** [Video Will be Updated Soon]

---

## ✨ Features

- **Event Tracking:** Add, edit, and manage birthdays, anniversaries, and custom events.
- **Automated Reminders:** Email reminders sent before each event.
- **Greeting Cards:** Shareable, animated cards with images and audio support.
- **Media Attachments:** Upload personal photos and voice messages.
- **Analytics Dashboard:** Visualize reminders sent, media usage, event stats, and more.
- **Admin Tools:** Export backups, view logs, and monitor system stats.
- **Light/Dark Mode:** Comfortable viewing for day or night.
- **Privacy Controls:** Password-protected cards and secure sharing.
- **Secure Sharing:** Expiring token-based share links with auto-renewal support.
- **Timezone Support:** Reminders and automation are scheduled with UTC+5:30 (IST) awareness.

---

## 🧠 Innovative Approach

- **Interactive Cards:** Recipients can view animated cards with voice notes and themed visuals.
- **Bulk Import:** Quickly add events using CSV or Excel.
- **Auto Media Cleanup:** Scheduled jobs remove old/unlinked media.
- **Supabase Integration:** Used for scalable, cloud-based media storage.
- **Admin Analytics:** Track usage trends, reminders triggered, and system health in real-time.

---

## 🔁 Automation & Stability

- **Auto Email Sharing:** If a card isn’t manually shared, the system auto-sends it to the intended recipient on the event date.
- **Recurring Events:** Birthday and anniversary reminders repeat annually without manual effort.
- **Email Verification:** Only verified users can trigger event reminders.
- **Token Expiry & Renewal:** Shared card links are time-bound and can be regenerated securely.
- **Rate Limiting:** Public card views and API endpoints are rate-limited to prevent abuse.
- **Automated Backups:** PostgreSQL database and media metadata are backed up regularly to secure cloud storage (e.g., Supabase or GitHub).
- **Health Monitoring:** `/health/` endpoint is pinged automatically via GitHub Actions or cron to detect system downtime.
- **Admin Error Dashboard:** View logged errors, failed jobs, and alerts in the Django admin.
- **Timezone-Aware Scheduling:** All reminders and emails are triggered respecting Indian Standard Time (UTC+5:30).

---

## 🛠️ How to Use

1. **Clone the repo:**
    ```sh
    git clone https://github.com/Harshit-code-tech/birthday-reminder.git
    cd birthday-reminder
    ```

2. **Install dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

3. **Run migrations:**
    ```sh
    python manage.py migrate
    ```

4. **Create a superuser:**
    ```sh
    python manage.py createsuperuser
    ```

5. **Start the server:**
    ```sh
    python manage.py runserver
    ```

6. **Open in browser:**  
   Visit [http://localhost:8000](http://localhost:8000)

---

## 🧪 Developer Highlights

- 🧾 Token-based sharing with expiry + renewal logic  
- 📩 MailerSend integration with retry logic  
- 🧠 Event-type based themes (Birthday, Anniversary, Custom)  
- 🕒 Timezone-aware cron scheduling (IST / UTC+5:30)  
- 📊 Analytics dashboard with reminder + user metrics  
- 🔐 Rate-limited views and email gating  
- ☁️ Supabase media storage with auto-clean jobs  
- 💾 Backup automation via GitHub Actions  
- 🛟 Health check ping endpoint and disaster readiness  
- 🛠️ Error logs visible in admin for debugging and tracking  

---

## 📬 Feedback & Contact

Feedback is welcome!  
- 📧 **Email:** [harshitghosh7@gmail.com](mailto:harshitghosh7@gmail.com)  
- 🐛 **GitHub Issues:** [Open an issue](https://github.com/Harshit-code-tech/birthday-reminder/issues)

---

