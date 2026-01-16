# AttendU 🎯
**AI-Powered Facial Recognition Attendance System**

AttendU modernizes classroom attendance using biometric verification, providing a seamless experience for students, teachers, and administrators.

---

### 🚀 Key Features

- **Biometric Security**: Secure face-ID registration for students.
- **AI Attendance**: Instant class-recordings via facial recognition.
- **Triple-Panel Access**: Dedicated portals for Students, Teachers, and Admins.
- **Offline Ready**: PWA support with local data caching for instant loading.
- **Real-time Analytics**: Live statistics on attendance percentages and standings.
- **Premium UI**: Modern dark theme with glassmorphism and aurora effects.

---

### 🛠️ Tech Stack

**Frontend**
- **Core**: React, TypeScript, Vite
- **UI/UX**: Tailwind CSS, Shadcn/UI, Framer Motion
- **State/Caching**: React Query, TanStack Persist
- **Auth**: Supabase Auth

**Backend**
- **Engine**: Python (FastAPI / Flask)
- **AI/ML**: face-api.js (Frontend), FAISS (Backend Vector Search)
- **Primary Database**: Supabase (PostgreSQL)

---

### 💻 Getting Started

#### 1. Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

---

### 📂 Project Structure

- `/frontend`: React application and UI components.
- `/backend`: Python AI services and API endpoints.
- `/supabase`: Database migrations and configuration.

---

### 👨‍💻 Developed By
**Zihad (the dev) ❤️**
