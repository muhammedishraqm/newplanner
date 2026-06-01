import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Plus, 
  Trash2, 
  BookOpen, 
  CheckSquare, 
  Flame, 
  X, 
  Smartphone, 
  Home, 
  Clock, 
  Sparkles,
  Moon
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  streak: number;
  history: string[]; // Array of YYYY-MM-DD completion dates
  frequency: string;
  createdAt: string;
}

interface StudySession {
  id: string;
  subject: string;
  topic: string;
  durationGoal: number; // in minutes
  date: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
}



interface DailyTask {
  id: string;
  name: string;
  hours: number;
  completed: boolean;
  date?: string; // YYYY-MM-DD
  createdAt: string;
}

type Tab = 'dashboard' | 'habits' | 'study' | 'goals';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const getTodayString = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Calculate streak based on daily history
const calculateStreak = (history: string[]): number => {
  if (history.length === 0) return 0;
  
  // Sort unique completion dates descending
  const sorted = [...new Set(history)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const todayStr = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  // If neither today nor yesterday is completed, streak is broken
  if (!sorted.includes(todayStr) && !sorted.includes(yesterdayStr)) {
    return 0;
  }
  
  let streak = 0;
  let checkDate = new Date();
  
  // If yesterday was done but today isn't yet, start counting back from yesterday
  if (!sorted.includes(todayStr) && sorted.includes(yesterdayStr)) {
    checkDate = yesterday;
  }
  
  while (true) {
    const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (sorted.includes(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

// Get list of 7 days of current week (Monday to Sunday)
const getWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    week.push({
      dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }), // M, T, W
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString()
    });
  }
  return week;
};



const getContributionGridData = (weeksCount: number = 22) => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
  
  // Get Sunday of the current week
  const currentSun = new Date(today);
  currentSun.setDate(today.getDate() - currentDay);
  
  // Start from Sunday of the week that is (weeksCount - 1) weeks ago
  const startDate = new Date(currentSun);
  startDate.setDate(currentSun.getDate() - (weeksCount - 1) * 7);
  
  const grid = [];
  for (let w = 0; w < weeksCount; w++) {
    const colDays = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (w * 7) + d);
      
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      colDays.push({
        dateStr,
        dayNum: date.getDate(),
        monthLabel: date.toLocaleDateString('en-US', { month: 'short' }),
        isFuture: date.getTime() > today.getTime()
      });
    }
    grid.push(colDays);
  }
  return grid;
};



interface ScheduleItem {
  id: string;
  title: string;
  timeLabel: string;
  description: string;
  isGap: boolean;
  completed: boolean;
  accentClass: string;
  startTimeDec: number;
  endTimeDec: number;
}

const generateSchedule = (tasks: DailyTask[], habits: Habit[], selectedDate: string): ScheduleItem[] => {
  const schedule: ScheduleItem[] = [];
  let currentHour = 9.0; // Start at 9:00 AM
  
  const formatTime = (decimalHour: number): string => {
    const hour = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hour) * 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHour}:${displayMinutes} ${ampm}`;
  };

  // Static early slots
  schedule.push({
    id: 'wakeup',
    title: 'Early Wakeup & Cleanse',
    timeLabel: '7:30 AM - 8:00 AM',
    description: 'Rise and fresh start for the day',
    isGap: true,
    completed: true,
    accentClass: 'stone',
    startTimeDec: 7.5,
    endTimeDec: 8.0
  });

  const activeHabitsToday = habits.filter(h => !h.history.includes(selectedDate)).map(h => h.name).join(', ');
  schedule.push({
    id: 'morning_habits',
    title: 'Morning Practice Rituals',
    timeLabel: '8:00 AM - 9:00 AM',
    description: activeHabitsToday ? `Active practices: ${activeHabitsToday}` : 'Mindfulness, reading and hydration practices',
    isGap: true,
    completed: false,
    accentClass: 'coral',
    startTimeDec: 8.0,
    endTimeDec: 9.0
  });

  // Breaks array
  const breaks = [
    { id: 'lunch', title: 'Lunch & Rest Break', hour: 13.0, duration: 1.0, desc: 'Nourishing meal and screen-free breather' },
    { id: 'habits_refresh', title: 'Habits & Movement Refresh', hour: 16.0, duration: 0.5, desc: 'Quick walk, hydration check, and breathing' },
    { id: 'dinner', title: 'Dinner & Wind Down', hour: 20.0, duration: 1.0, desc: 'Healthy dinner and reflection time' }
  ];

  let breaksScheduled = { lunch: false, habits_refresh: false, dinner: false };

  const checkAndScheduleBreaks = () => {
    breaks.forEach(b => {
      const key = b.id as 'lunch' | 'habits_refresh' | 'dinner';
      if (!breaksScheduled[key] && currentHour >= b.hour) {
        const start = currentHour;
        const end = currentHour + b.duration;
        schedule.push({
          id: b.id,
          title: b.title,
          timeLabel: `${formatTime(start)} - ${formatTime(end)}`,
          description: b.desc,
          isGap: true,
          completed: false,
          accentClass: 'stone',
          startTimeDec: start,
          endTimeDec: end
        });
        currentHour = end;
        breaksScheduled[key] = true;
      }
    });
  };

  tasks.forEach((task, idx) => {
    let remainingHours = task.hours;
    
    while (remainingHours > 0) {
      // First, see if we should inject any breaks before starting/continuing the task
      checkAndScheduleBreaks();

      // Find the NEXT upcoming break
      const nextBreak = breaks.find(b => {
        const key = b.id as 'lunch' | 'habits_refresh' | 'dinner';
        return !breaksScheduled[key] && currentHour < b.hour;
      });

      if (nextBreak && currentHour + remainingHours > nextBreak.hour) {
        // The task overlaps with the next break! We must split the task.
        const taskSliceHours = nextBreak.hour - currentHour;
        if (taskSliceHours > 0) {
          const start = currentHour;
          const end = nextBreak.hour;
          schedule.push({
            id: `${task.id}_part_${start}`,
            title: `${task.name} (Part 1)`,
            timeLabel: `${formatTime(start)} - ${formatTime(end)}`,
            description: `Core task block — ${taskSliceHours.toFixed(1)} hours focus`,
            isGap: false,
            completed: task.completed,
            accentClass: idx % 2 === 0 ? 'coral' : 'black',
            startTimeDec: start,
            endTimeDec: end
          });
          currentHour = end;
          remainingHours -= taskSliceHours;
        }
        
        // Now inject the break immediately!
        const startBreak = currentHour;
        const endBreak = currentHour + nextBreak.duration;
        schedule.push({
          id: nextBreak.id,
          title: nextBreak.title,
          timeLabel: `${formatTime(startBreak)} - ${formatTime(endBreak)}`,
          description: nextBreak.desc,
          isGap: true,
          completed: false,
          accentClass: 'stone',
          startTimeDec: startBreak,
          endTimeDec: endBreak
        });
        currentHour = endBreak;
        breaksScheduled[nextBreak.id as 'lunch' | 'habits_refresh' | 'dinner'] = true;
        
      } else {
        // No upcoming breaks block this task. Schedule the entire remaining portion!
        const start = currentHour;
        const end = currentHour + remainingHours;
        schedule.push({
          id: task.id,
          title: task.name,
          timeLabel: `${formatTime(start)} - ${formatTime(end)}`,
          description: `Core task block — ${remainingHours.toFixed(1)} hours focus`,
          isGap: false,
          completed: task.completed,
          accentClass: idx % 2 === 0 ? 'coral' : 'black',
          startTimeDec: start,
          endTimeDec: end
        });
        currentHour = end;
        remainingHours = 0;
      }
    }
  });

  // Ensure any remaining breaks are scheduled in order
  checkAndScheduleBreaks();
  breaks.forEach(b => {
    const key = b.id as 'lunch' | 'habits_refresh' | 'dinner';
    if (!breaksScheduled[key]) {
      const start = Math.max(currentHour, b.hour);
      const end = start + b.duration;
      schedule.push({
        id: b.id,
        title: b.title,
        timeLabel: `${formatTime(start)} - ${formatTime(end)}`,
        description: b.desc,
        isGap: true,
        completed: false,
        accentClass: 'stone',
        startTimeDec: start,
        endTimeDec: end
      });
      currentHour = end;
      breaksScheduled[key] = true;
    }
  });

  // Night wind down
  if (currentHour < 22.0) {
    const start = currentHour;
    schedule.push({
      id: 'winddown',
      title: 'Journal & Wind Down',
      timeLabel: `${formatTime(start)} - 10:00 PM`,
      description: 'Reflect on accomplishments, read, and prepare for sleep',
      isGap: true,
      completed: false,
      accentClass: 'stone',
      startTimeDec: start,
      endTimeDec: 22.0
    });
  }

  // Sort schedule by startTimeDec to display in perfect timeline order!
  return schedule.sort((a, b) => a.startTimeDec - b.startTimeDec);
};

// ==========================================
// COMPONENT IMPLEMENTATION
// ==========================================

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [pwaDismissed, setPwaDismissed] = useState<boolean>(false);
  
  // Core Data States
  const [habits, setHabits] = useState<Habit[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [sleepLogs, setSleepLogs] = useState<{ [date: string]: number }>({});
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskHours, setQuickTaskHours] = useState('2');

  // Modal Control States
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showStudyModal, setShowStudyModal] = useState(false);

  // New Habit Form States
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🧘‍♂️');
  const [newHabitColor, setNewHabitColor] = useState('var(--accent-sage)');
  const [newHabitFreq, setNewHabitFreq] = useState('Everyday');

  // New Study Session Form States
  const [newStudySubject, setNewStudySubject] = useState('');
  const [newStudyTopic, setNewStudyTopic] = useState('');
  const [newStudyDuration, setNewStudyDuration] = useState('60');
  const [newStudyDate, setNewStudyDate] = useState(getTodayString());



  // Load and Save Local Storage
  useEffect(() => {
    // One-time migration to wipe the legacy seeded sample data
    const isWiped = localStorage.getItem('kairos_sample_wiped');
    if (!isWiped) {
      localStorage.removeItem('kairos_habits');
      localStorage.removeItem('kairos_study');
      localStorage.removeItem('kairos_daily_tasks');
      localStorage.removeItem('kairos_sleep_logs');
      localStorage.setItem('kairos_sample_wiped', 'true');
    }

    const cachedHabits = localStorage.getItem('kairos_habits');
    const cachedStudy = localStorage.getItem('kairos_study');
    const cachedDailyTasks = localStorage.getItem('kairos_daily_tasks');
    const cachedSleep = localStorage.getItem('kairos_sleep_logs');
    const cachedPwa = localStorage.getItem('kairos_pwa_dismissed');

    if (cachedDailyTasks) {
      setDailyTasks(JSON.parse(cachedDailyTasks));
    } else {
      setDailyTasks([]);
      localStorage.setItem('kairos_daily_tasks', JSON.stringify([]));
    }

    if (cachedHabits) {
      setHabits(JSON.parse(cachedHabits));
    } else {
      setHabits([]);
      localStorage.setItem('kairos_habits', JSON.stringify([]));
    }

    if (cachedStudy) {
      setStudySessions(JSON.parse(cachedStudy));
    } else {
      setStudySessions([]);
      localStorage.setItem('kairos_study', JSON.stringify([]));
    }

    if (cachedSleep) {
      setSleepLogs(JSON.parse(cachedSleep));
    } else {
      setSleepLogs({});
      localStorage.setItem('kairos_sleep_logs', JSON.stringify({}));
    }

    if (cachedPwa) {
      setPwaDismissed(JSON.parse(cachedPwa));
    }
  }, []);

  // Synchronizers
  const updateHabitsState = (updated: Habit[]) => {
    setHabits(updated);
    localStorage.setItem('kairos_habits', JSON.stringify(updated));
  };

  const updateStudyState = (updated: StudySession[]) => {
    setStudySessions(updated);
    localStorage.setItem('kairos_study', JSON.stringify(updated));
  };



  const dismissPwa = () => {
    setPwaDismissed(true);
    localStorage.setItem('kairos_pwa_dismissed', 'true');
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Sleep Duration Log
  const handleLogSleep = (hours: number) => {
    const current = sleepLogs[selectedDate];
    const updated = { ...sleepLogs };
    if (current === hours) {
      delete updated[selectedDate];
    } else {
      updated[selectedDate] = hours;
    }
    setSleepLogs(updated);
    localStorage.setItem('kairos_sleep_logs', JSON.stringify(updated));
  };

  // Habit Toggle Check
  const handleToggleHabit = (id: string) => {
    const todayStr = getTodayString();
    const updated = habits.map(habit => {
      if (habit.id === id) {
        let history = [...habit.history];
        if (history.includes(todayStr)) {
          // Remove completion (uncheck)
          history = history.filter(date => date !== todayStr);
        } else {
          // Add completion (check)
          history.push(todayStr);
        }
        // Recalculate streak
        const streak = calculateStreak(history);
        return { ...habit, history, streak };
      }
      return habit;
    });
    updateHabitsState(updated);
  };

  // Habit Add
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: 'habit_' + Date.now(),
      name: newHabitName.trim(),
      description: newHabitDesc.trim() || 'A positive daily routine',
      icon: newHabitIcon,
      color: newHabitColor,
      streak: 0,
      history: [],
      frequency: newHabitFreq,
      createdAt: new Date().toISOString()
    };

    updateHabitsState([newHabit, ...habits]);
    
    // Clear forms and close
    setNewHabitName('');
    setNewHabitDesc('');
    setNewHabitIcon('🧘‍♂️');
    setNewHabitColor('var(--accent-sage)');
    setNewHabitFreq('Everyday');
    setShowHabitModal(false);
  };
  // Daily Tasks handlers for Home Page timeline schedule
  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskName.trim()) return;
    const hours = parseFloat(quickTaskHours) || 1;
    const newTask: DailyTask = {
      id: 'task_' + Date.now(),
      name: quickTaskName.trim(),
      hours,
      completed: false,
      date: selectedDate,
      createdAt: new Date().toISOString()
    };
    const updated = [newTask, ...dailyTasks];
    setDailyTasks(updated);
    localStorage.setItem('kairos_daily_tasks', JSON.stringify(updated));
    setQuickTaskName('');
    setQuickTaskHours('2');
  };

  const handleToggleTaskCompleted = (id: string) => {
    const updated = dailyTasks.map(t => {
      if (t.id === id) return { ...t, completed: !t.completed };
      return t;
    });
    setDailyTasks(updated);
    localStorage.setItem('kairos_daily_tasks', JSON.stringify(updated));
  };

  const handleDeleteTask = (id: string) => {
    const updated = dailyTasks.filter(t => t.id !== id);
    setDailyTasks(updated);
    localStorage.setItem('kairos_daily_tasks', JSON.stringify(updated));
  };

  // Habit Preset Selection
  const applyHabitPreset = (name: string, icon: string, color: string, desc: string) => {
    setNewHabitName(name);
    setNewHabitIcon(icon);
    setNewHabitColor(color);
    setNewHabitDesc(desc);
  };

  // Habit Delete
  const handleDeleteHabit = (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    updateHabitsState(updated);
  };

  // Study Toggle Check
  const handleToggleStudySession = (id: string) => {
    const updated = studySessions.map(session => {
      if (session.id === id) {
        return { ...session, completed: !session.completed };
      }
      return session;
    });
    updateStudyState(updated);
  };

  // Study Session Add
  const handleAddStudySession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudySubject.trim() || !newStudyTopic.trim()) return;

    const newSession: StudySession = {
      id: 'study_' + Date.now(),
      subject: newStudySubject.trim(),
      topic: newStudyTopic.trim(),
      durationGoal: parseInt(newStudyDuration) || 60,
      date: newStudyDate,
      completed: false,
      createdAt: new Date().toISOString()
    };

    updateStudyState([newSession, ...studySessions]);

    // Clear and close
    setNewStudySubject('');
    setNewStudyTopic('');
    setNewStudyDuration('60');
    setNewStudyDate(getTodayString());
    setShowStudyModal(false);
  };

  // Study Session Delete
  const handleDeleteStudySession = (id: string) => {
    const updated = studySessions.filter(s => s.id !== id);
    updateStudyState(updated);
  };



  // ==========================================
  // VIEW COMPUTATIONS
  // ==========================================
  const todayStr = getTodayString();
  const weekDates = getWeekDates();

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning, Creator.';
    if (hour >= 12 && hour < 17) return 'Good afternoon, Builder.';
    if (hour >= 17 && hour < 21) return 'Good evening, Thinker.';
    return 'Rest well, Dreamer.';
  };

  // Selected date display format
  const getSelectedDateDisplay = () => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
    return displayTodayDate;
  };

  // 1. Dashboard computations
  const habitsDoneToday = habits.filter(h => h.history.includes(todayStr)).length;
  const totalHabitsToday = habits.length;
  const habitsPercent = totalHabitsToday > 0 ? Math.round((habitsDoneToday / totalHabitsToday) * 100) : 0;

  // Study hours logged this week
  const getWeeklyStudyMinutes = () => {
    const weekStrList = weekDates.map(w => w.dateStr);
    return studySessions
      .filter(s => s.completed && weekStrList.includes(s.date))
      .reduce((sum, s) => sum + s.durationGoal, 0);
  };
  const weeklyStudyHours = (getWeeklyStudyMinutes() / 60).toFixed(1);

  // 2. Study weekly chart array calculation
  const studyChartData = weekDates.map(day => {
    const minutes = studySessions
      .filter(s => s.completed && s.date === day.dateStr)
      .reduce((sum, s) => sum + s.durationGoal, 0);
    const hours = minutes / 60;
    return {
      ...day,
      hours,
      heightPct: Math.min(Math.round((hours / 6) * 100), 100) // cap visual scale at 6 hours
    };
  });



  // Today's formatted display date
  const displayTodayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="app-container">
      {/* ==========================================
          HEADER (Mobile top bar with status translucent)
          ========================================== */}
      <header className="app-header">
        <h1 className="serif-font">
          Kairos<span className="header-accent-dot"></span>
        </h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </header>

      {/* ==========================================
          SIDEBAR NAVIGATION (Desktop/Tablet)
          ========================================== */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          Kairos<span>.</span>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Home size={18} /> Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            <Sparkles size={18} /> Habits
          </button>
          <button 
            className={`nav-item ${activeTab === 'study' ? 'active' : ''}`}
            onClick={() => setActiveTab('study')}
          >
            <BookOpen size={18} /> Study Planner
          </button>
          <button 
            className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <CheckSquare size={18} /> Progress
          </button>
        </nav>
        <footer className="sidebar-footer">
          Designed for solitude
        </footer>
      </aside>

      {/* ==========================================
          BOTTOM NAVIGATION BAR (Mobile only)
          ========================================== */}
      <nav className="app-bottom-nav">
        <button 
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'habits' ? 'active' : ''}`}
          onClick={() => setActiveTab('habits')}
        >
          <Sparkles size={20} />
          <span>Habits</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'study' ? 'active' : ''}`}
          onClick={() => setActiveTab('study')}
        >
          <BookOpen size={20} />
          <span>Study</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <CheckSquare size={20} />
          <span>Progress</span>
        </button>
      </nav>

      {/* ==========================================
          MAIN VIEWPORT
          ========================================== */}
      <main className="main-viewport">
        <div className="container-narrow">
          
          {/* ==========================================
              TAB: DASHBOARD
              ========================================== */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <p className="serif-font" style={{ fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                  {getGreeting()}
                </p>
                <h1 className="section-title" style={{ fontSize: '2.2rem' }}>{getSelectedDateDisplay()}</h1>
              </div>

              {/* iPhone Safari Onboarding Tooltip */}
              {!pwaDismissed && (
                <div className="pwa-onboarding">
                  <button className="pwa-close" onClick={dismissPwa}>
                    <X size={16} />
                  </button>
                  <h4>
                    <Smartphone size={18} /> Optimize for iPhone Safari
                  </h4>
                  <p>
                    Add **Kairos** directly to your Home Screen to remove the web browser chrome and enjoy a distraction-free, fullscreen personal productivity journal.
                  </p>
                  <div className="pwa-onboarding-steps">
                    <div className="pwa-onboarding-step">
                      <span className="pwa-onboarding-icon">
                        {/* Custom iOS Share Indicator */}
                        <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13V1m0 0L3.5 4.5M7 1L10.5 4.5M1 9.5V17h12V9.5"/></svg>
                      </span>
                      <span>Tap Safari's <strong>Share</strong> icon in bottom toolbar.</span>
                    </div>
                    <div className="pwa-onboarding-step">
                      <span className="pwa-onboarding-icon">
                        <Plus size={12} />
                      </span>
                      <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Horizontal Weekdays Calendar Bar */}
              <div className="calendar-week-bar">
                {weekDates.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`calendar-week-day ${selectedDate === day.dateStr ? 'active' : ''}`}
                    onClick={() => setSelectedDate(day.dateStr)}
                  >
                    <span className="calendar-week-day-name">{day.label.slice(0, 3)}</span>
                    <span className="calendar-week-day-num">{day.dayNum}</span>
                  </div>
                ))}
              </div>

              {/* Quick Task Scheduler Widget */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title serif-font" style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> Quick Task Scheduler
                </h3>
                <form onSubmit={handleQuickAddTask} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Task name (e.g. Machine Learning, Systems Research)"
                    value={quickTaskName}
                    onChange={e => setQuickTaskName(e.target.value)}
                    style={{ flex: '2 1 200px', padding: '10px 14px', fontSize: '0.9rem' }}
                    required
                  />
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="Hours"
                    value={quickTaskHours}
                    onChange={e => setQuickTaskHours(e.target.value)}
                    min="0.5"
                    max="12"
                    step="0.5"
                    style={{ flex: '1 1 80px', padding: '10px 14px', fontSize: '0.9rem' }}
                    required
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ flex: '1 1 120px', padding: '10px 16px', fontSize: '0.9rem' }}
                  >
                    Schedule
                  </button>
                </form>
              </div>

              {/* Pathway Vertical daily schedule timeline */}
              <div className="timeline-container">
                <div className="timeline-track-line" />
                {generateSchedule(dailyTasks.filter(t => (t.date || getTodayString()) === selectedDate), habits, selectedDate).map((item) => {
                  const today = new Date();
                  const currentDecHour = today.getHours() + today.getMinutes() / 60;
                  const isCurrentTime = currentDecHour >= item.startTimeDec && currentDecHour < item.endTimeDec;
                  
                  const isNodeActive = isCurrentTime;
                  const cardActiveClass = isNodeActive ? (item.accentClass === 'coral' ? 'active-coral' : 'active-black') : '';
                  const cardClass = item.isGap ? 'timeline-card is-gap-card' : `timeline-card ${cardActiveClass}`;
                  const nodeClass = `timeline-node ${item.completed ? 'completed' : ''} ${isNodeActive ? 'active' : ''} ${item.isGap ? 'is-gap-node' : ''}`;

                  return (
                    <div key={item.id} className={`timeline-item-wrap ${item.isGap ? 'is-gap-wrap' : ''}`}>
                      <div 
                        className={nodeClass} 
                      />
                      {item.isGap ? (
                        <div className={cardClass}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1 }}>
                            <span style={{ fontWeight: 500, fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.75 }}>{item.timeLabel.split(' - ')[0]}</span>
                            <span style={{ color: 'var(--border-color)', opacity: 0.5 }}>•</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{item.title}</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={cardClass}
                          onClick={() => handleToggleTaskCompleted(item.id.split('_part_')[0])}
                          style={{ 
                            cursor: 'pointer', 
                            opacity: item.completed ? 0.65 : 1, 
                            transition: 'opacity 0.2s ease, transform 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span className="serif-font" style={{ fontSize: '0.75rem', fontWeight: 700, color: isNodeActive ? '#FFFFFF' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {item.timeLabel}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(item.id.split('_part_')[0]);
                              }}
                              style={{ background: 'transparent', border: 'none', color: isNodeActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                              aria-label="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <h4 
                            className="serif-font" 
                            style={{ 
                              fontSize: '1.25rem', 
                              fontWeight: 600, 
                              marginTop: '2px', 
                              color: isNodeActive ? '#FFFFFF' : 'var(--text-primary)',
                              textDecoration: item.completed ? 'line-through' : 'none'
                            }}
                          >
                            {item.title}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: isNodeActive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)', marginTop: '4px' }}>
                            {item.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB: HABITS TRACKER
              ========================================== */}
          {activeTab === 'habits' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h1 className="section-title">Habit Blueprint</h1>
                  <p className="section-subtitle">Cultivate positive daily routines and monitor continuous streaks.</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowHabitModal(true)}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> New Practice
                </button>
              </div>

              {/* Progress summary bar */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <span style={{ fontSize: '0.9rem' }}>Today's Goal Tracker</span>
                <span className="serif-font" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {habitsPercent}% completed ({habitsDoneToday} / {totalHabitsToday})
                </span>
              </div>

              {habits.length === 0 ? (
                <div className="card empty-state">
                  <Sparkles size={40} />
                  <h3>Begin Your Journey</h3>
                  <p>Design habit categories, track logs, and build beautiful daily consistency.</p>
                  <button className="btn btn-primary" onClick={() => setShowHabitModal(true)} style={{ marginTop: '16px' }}>
                    Create First Habit
                  </button>
                </div>
              ) : (
                <div className="habit-list">
                  {habits.map((habit, idx) => {
                    const isDone = habit.history.includes(todayStr);
                    const checkedClass = isDone ? (idx % 2 === 0 ? 'checked-coral' : 'checked-black') : '';
                    return (
                      <div key={habit.id} className={`habit-item ${checkedClass}`}>
                        <div className="habit-item-left">
                          <div className="habit-info">
                            <h4>{habit.name}</h4>
                            <p>{habit.description}</p>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {habit.frequency}
                              </span>
                              {habit.streak > 0 && (
                                <span className="habit-streak">
                                  <Flame size={10} fill="currentColor" /> {habit.streak} day streak
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <button 
                            onClick={() => handleDeleteHabit(habit.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            aria-label="Delete habit"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div 
                            className={`habit-checkbox ${isDone ? 'checked' : ''}`}
                            style={{ 
                              borderColor: isDone ? habit.color : 'var(--border-color)', 
                              backgroundColor: isDone ? habit.color : 'transparent' 
                            }}
                            onClick={() => handleToggleHabit(habit.id)}
                          >
                            {isDone && <Check size={16} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB: STUDY PLANNER
              ========================================== */}
          {activeTab === 'study' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h1 className="section-title">Study Sanctuary</h1>
                  <p className="section-subtitle">Schedule focused study deep dives and log academic hours.</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowStudyModal(true)}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Schedule Session
                </button>
              </div>

              {/* Weekly Study Hours Chart Card */}
              <div className="card study-chart-card">
                <h3 className="card-title serif-font" style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--accent-sage)' }} /> Weekly Deep Work Summary
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Total of <strong>{weeklyStudyHours} hours</strong> studied this week. 
                </p>

                <div className="study-chart">
                  {studyChartData.map((bar, idx) => (
                    <div key={idx} className="study-chart-bar-wrap">
                      <div className="study-chart-bar-container">
                        {bar.hours > 0 && (
                          <div className="study-chart-val">{bar.hours.toFixed(1)}h</div>
                        )}
                        <div 
                          className={`study-chart-bar ${bar.isToday ? 'today' : ''}`}
                          style={{ height: `${bar.heightPct || 2}%` }}
                        />
                      </div>
                      <span className={`study-chart-label ${bar.isToday ? 'serif-font' : ''}`} style={{ color: bar.isToday ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: bar.isToday ? 600 : 500 }}>
                        {bar.dayName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sessions Lists */}
              <div className="card">
                <h3 className="card-title serif-font" style={{ marginBottom: '16px', display: 'flex', justifySelf: 'start', fontSize: '1.1rem' }}>
                  Upcoming & Logged Sessions
                </h3>

                {studySessions.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen size={36} />
                    <p>No study logs. Block out time for subjects, define core topics, and measure focus duration.</p>
                  </div>
                ) : (
                  <div className="study-list">
                    {studySessions.map(session => (
                      <div key={session.id} className="study-item">
                        <div className="study-item-header">
                          <div>
                            <span className="study-subject" style={{ color: session.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {session.subject}
                            </span>
                            <p className="study-topic" style={{ textDecoration: session.completed ? 'line-through' : 'none', color: session.completed ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                              {session.topic}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                              onClick={() => handleDeleteStudySession(session.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              aria-label="Delete session"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button 
                              className="btn"
                              onClick={() => handleToggleStudySession(session.id)}
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.75rem',
                                backgroundColor: session.completed ? 'hsla(140, 22%, 52%, 0.15)' : 'var(--bg-card)',
                                color: session.completed ? 'var(--accent-sage)' : 'var(--text-primary)',
                                border: `1px solid ${session.completed ? 'transparent' : 'var(--border-color)'}`
                              }}
                            >
                              {session.completed ? 'Completed' : 'Mark Completed'}
                            </button>
                          </div>
                        </div>

                        <div className="study-details">
                          <span>Target: {session.durationGoal} mins</span>
                          <span>Scheduled: {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB: PROGRESS (Visual Heatmap Momentum grids for habits and daily plan)
              ========================================== */}
          {activeTab === 'goals' && (
            <div>
              <div style={{ marginBottom: '18px' }}>
                <h1 className="section-title">Progress Sanctuary</h1>
                <p className="section-subtitle">Monitor your daily habits consistency and daily plan task performance.</p>
              </div>

              {/* Heatmaps Sanctuary (GitHub-style Contribution Matrix) */}
              <div style={{ marginBottom: '28px' }}>
                
                {/* 1. Daily Plan Performance (Tasks Heatmap) */}
                <div className="card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 className="serif-font" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Daily Plan Performance</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Tracks your scheduled focus task completion rates over the last 22 weeks.
                      </p>
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="contribution-grid-scroll">
                    <div className="contribution-grid-container">
                      <div className="contribution-grid-weekdays">
                        <span>S</span>
                        <span>M</span>
                        <span>T</span>
                        <span>W</span>
                        <span>T</span>
                        <span>F</span>
                        <span>S</span>
                      </div>
                      <div className="contribution-grid-columns">
                        {getContributionGridData(22).map((col, colIdx) => (
                          <div key={colIdx} className="contribution-grid-column">
                            {col.map((day) => {
                              // Find all tasks for this date
                              const dayTasks = dailyTasks.filter(t => (t.date || t.createdAt.split('T')[0]) === day.dateStr);
                              const total = dayTasks.length;
                              const completed = dayTasks.filter(t => t.completed).length;
                              
                              let intensityClass = 'task-intensity-none';
                              if (total > 0) {
                                const ratio = completed / total;
                                if (ratio === 1) intensityClass = 'task-intensity-high';
                                else if (ratio >= 0.5) intensityClass = 'task-intensity-medium';
                                else if (ratio > 0) intensityClass = 'task-intensity-low';
                              }
                              
                              const tooltip = total > 0 
                                ? `${completed}/${total} tasks done (${Math.round((completed/total)*100)}%)` 
                                : 'No tasks scheduled';

                              return (
                                <div 
                                  key={day.dateStr}
                                  className={`contribution-cell ${intensityClass} ${day.isFuture ? 'is-future' : ''}`}
                                  title={`${day.dateStr}: ${tooltip}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Sleep Time Analysis Heatmap */}
                <div className="card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <h4 className="serif-font" style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Moon size={18} style={{ color: '#375F91' }} /> Sleep Time Analysis
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Visualizing sleep duration patterns over the last 22 weeks.
                      </p>
                    </div>
                    {sleepLogs[selectedDate] && (
                      <span style={{ fontSize: '0.78rem', color: '#1A2E4C', backgroundColor: '#E1EDF7', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                        {sleepLogs[selectedDate]} hours logged
                      </span>
                    )}
                  </div>

                  {/* Sleep Heatmap Grid */}
                  <div className="contribution-grid-scroll" style={{ marginBottom: '16px' }}>
                    <div className="contribution-grid-container">
                      <div className="contribution-grid-weekdays">
                        <span>S</span>
                        <span>M</span>
                        <span>T</span>
                        <span>W</span>
                        <span>T</span>
                        <span>F</span>
                        <span>S</span>
                      </div>
                      <div className="contribution-grid-columns">
                        {getContributionGridData(22).map((col, colIdx) => (
                          <div key={colIdx} className="contribution-grid-column">
                            {col.map((day) => {
                              const hours = sleepLogs[day.dateStr];
                              let cellClass = 'sleep-intensity-none';
                              if (hours === 7) cellClass = 'sleep-7';
                              else if (hours === 8) cellClass = 'sleep-8';
                              else if (hours === 9) cellClass = 'sleep-9';
                              else if (hours === 10) cellClass = 'sleep-10';
                              
                              const tooltip = hours 
                                ? `${hours} hours of sleep` 
                                : 'No sleep data logged';

                              return (
                                <div 
                                  key={day.dateStr}
                                  className={`contribution-cell ${cellClass} ${day.isFuture ? 'is-future' : ''}`}
                                  title={`${day.dateStr}: ${tooltip}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sleep Logging Action Row */}
                  <div style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: '14px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Log sleep duration for {getSelectedDateDisplay()}:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {[7, 8, 9, 10].map((hours) => {
                        const isSelected = sleepLogs[selectedDate] === hours;
                        return (
                          <button
                            key={hours}
                            onClick={() => handleLogSleep(hours)}
                            style={{
                              backgroundColor: isSelected ? '#000000' : 'var(--bg-surface)',
                              color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {hours} hrs {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Habit blueprints list stack with individual heatmaps (exactly like screenshot!) */}
                <div>
                  <h4 className="serif-font" style={{ fontSize: '1.25rem', fontStyle: 'italic', marginBottom: '12px' }}>Habit Blueprints</h4>
                  {habits.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No habits established yet. Start by defining some in the Habits page.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {habits.map((habit) => {
                        const completedDaysCount = habit.history.length;
                        
                        return (
                          <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                              <div>
                                <h4 className="serif-font" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{habit.name}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {habit.description}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {habit.streak > 0 && (
                                  <span className="habit-streak" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                    <Flame size={10} fill="currentColor" /> {habit.streak}d streak
                                  </span>
                                )}
                                <span style={{ fontWeight: 600 }}>
                                  {completedDaysCount}d completed
                                </span>
                              </div>
                            </div>

                            {/* Habit Heatmap Grid */}
                            <div className="contribution-grid-scroll">
                              <div className="contribution-grid-container">
                                <div className="contribution-grid-weekdays">
                                  <span>S</span>
                                  <span>M</span>
                                  <span>T</span>
                                  <span>W</span>
                                  <span>T</span>
                                  <span>F</span>
                                  <span>S</span>
                                </div>
                                <div className="contribution-grid-columns">
                                  {getContributionGridData(22).map((col, colIdx) => (
                                    <div key={colIdx} className="contribution-grid-column">
                                      {col.map((day) => {
                                        const isCompleted = habit.history.includes(day.dateStr);
                                        const cellClass = isCompleted ? 'completed-coral' : '';
                                        const tooltip = isCompleted ? 'Completed' : 'Not completed';

                                        return (
                                          <div 
                                            key={day.dateStr}
                                            className={`contribution-cell ${cellClass} ${day.isFuture ? 'is-future' : ''}`}
                                            title={`${day.dateStr}: ${tooltip}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



        </div>
      </main>

      {/* ==========================================
          MODALS / BOTTOM SHEETS
          ========================================== */}
      
      {/* 1. Modal: Add Habit */}
      {showHabitModal && (
        <div className="modal-overlay" onClick={() => setShowHabitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font">Design Practice</h3>
              <button className="close-btn" onClick={() => setShowHabitModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHabit}>
              {/* Presets Row */}
              <div style={{ marginBottom: '16px' }}>
                <span className="input-label">Presets Suggestions</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button 
                    type="button" 
                    className="preset-btn"
                    onClick={() => applyHabitPreset('Meditate', '', 'var(--accent-sage)', '10 mins of focus breathing')}
                  >
                    Meditation
                  </button>
                  <button 
                    type="button" 
                    className="preset-btn"
                    onClick={() => applyHabitPreset('Hydrate', '', 'var(--accent-slate)', 'Drink 3L mineral water')}
                  >
                    Hydration
                  </button>
                  <button 
                    type="button" 
                    className="preset-btn"
                    onClick={() => applyHabitPreset('Exercise', '', 'var(--accent-terracotta)', '45 mins cardio/lifts')}
                  >
                    Exercise
                  </button>
                  <button 
                    type="button" 
                    className="preset-btn"
                    onClick={() => applyHabitPreset('Read 30 mins', '', 'var(--accent-primary)', 'Read journal or book chapters')}
                  >
                    Reading
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Habit Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Read 30 mins"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Visual Accent</label>
                <select 
                  className="select-field" 
                  value={newHabitColor} 
                  onChange={e => setNewHabitColor(e.target.value)}
                >
                  <option value="var(--accent-sage)">Sage Green</option>
                  <option value="var(--accent-primary)">Cozy Sand</option>
                  <option value="var(--accent-terracotta)">Terracotta</option>
                  <option value="var(--accent-slate)">Slate Blue</option>
                  <option value="var(--accent-rose)">Dusty Rose</option>
                  <option value="var(--accent-purple)">Royal Purple</option>
                </select>
              </div>


              <div className="input-group">
                <label className="input-label">Short Description</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. 20 pages of non-fiction"
                  value={newHabitDesc}
                  onChange={e => setNewHabitDesc(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Target Frequency</label>
                <select 
                  className="select-field" 
                  value={newHabitFreq} 
                  onChange={e => setNewHabitFreq(e.target.value)}
                >
                  <option value="Everyday">Everyday</option>
                  <option value="5x a week">5x a week</option>
                  <option value="3x a week">3x a week</option>
                  <option value="Weekends only">Weekends only</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHabitModal(false)} style={{ flexGrow: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 2 }}>
                  Establish Practice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Add Study Session */}
      {showStudyModal && (
        <div className="modal-overlay" onClick={() => setShowStudyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font">Schedule Study Block</h3>
              <button className="close-btn" onClick={() => setShowStudyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStudySession}>
              <div className="input-group">
                <label className="input-label">Subject</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Computer Science, Mathematics, Writing"
                  value={newStudySubject}
                  onChange={e => setNewStudySubject(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Specific Topic Focus</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Neural Networks, Calculus, Typography"
                  value={newStudyTopic}
                  onChange={e => setNewStudyTopic(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Duration Goal (Mins)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={newStudyDuration}
                    onChange={e => setNewStudyDuration(e.target.value)}
                    min="5"
                    max="480"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Target Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newStudyDate}
                    onChange={e => setNewStudyDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStudyModal(false)} style={{ flexGrow: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 2 }}>
                  Log Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
