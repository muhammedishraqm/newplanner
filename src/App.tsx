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
  Sparkles
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

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: string; // YYYY-MM-DD
  subTasks: SubTask[];
  createdAt: string;
}

interface DailyTask {
  id: string;
  name: string;
  hours: number;
  completed: boolean;
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

const generateSchedule = (tasks: DailyTask[], habits: Habit[]): ScheduleItem[] => {
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

  // Calculate today's YYYY-MM-DD
  const todayObj = new Date();
  const yyyy = todayObj.getFullYear();
  const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(todayObj.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const activeHabitsToday = habits.filter(h => !h.history.includes(todayStr)).map(h => h.name).join(', ');
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
  const [pwaDismissed, setPwaDismissed] = useState<boolean>(false);
  
  // Core Data States
  const [habits, setHabits] = useState<Habit[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskHours, setQuickTaskHours] = useState('2');

  // Modal Control States
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

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

  // New Goal Form States
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState(getTodayString());
  const [newGoalPriority, setNewGoalPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newGoalSubtasksText, setNewGoalSubtasksText] = useState('');

  // Goals Filtering States
  const [goalsFilter, setGoalsFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'completed'>('all');

  // Load and Save Local Storage
  useEffect(() => {
    const cachedHabits = localStorage.getItem('kairos_habits');
    const cachedStudy = localStorage.getItem('kairos_study');
    const cachedGoals = localStorage.getItem('kairos_goals');
    const cachedDailyTasks = localStorage.getItem('kairos_daily_tasks');
    const cachedPwa = localStorage.getItem('kairos_pwa_dismissed');

    // Make sure we adjust dates dynamically if using default data, so the user sees logs relative to today!
    if (cachedDailyTasks) {
      setDailyTasks(JSON.parse(cachedDailyTasks));
    } else {
      const seededTasks: DailyTask[] = [
        { id: 'dt1', name: 'Machine Learning Coding', hours: 2, completed: false, createdAt: new Date().toISOString() },
        { id: 'dt2', name: 'Systems Research Notes', hours: 3, completed: false, createdAt: new Date().toISOString() },
        { id: 'dt3', name: 'Responsive Web Layouts', hours: 5, completed: false, createdAt: new Date().toISOString() }
      ];
      setDailyTasks(seededTasks);
      localStorage.setItem('kairos_daily_tasks', JSON.stringify(seededTasks));
    }

    if (cachedHabits) {
      setHabits(JSON.parse(cachedHabits));
    } else {
      // Modify seed data history to match current date
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const tStr = format(today);
      const yStr = format(yesterday);
      
      const seededHabits: Habit[] = [
        {
          id: 'h1',
          name: 'Morning Mindfulness',
          description: '10 minutes of silent meditation',
          icon: '',
          color: 'var(--accent-sage)',
          streak: 2,
          history: [yStr, tStr],
          frequency: 'Everyday',
          createdAt: new Date().toISOString()
        },
        {
          id: 'h2',
          name: 'Read Non-Fiction',
          description: '20 pages of personal development',
          icon: '',
          color: 'var(--accent-primary)',
          streak: 1,
          history: [yStr],
          frequency: 'Everyday',
          createdAt: new Date().toISOString()
        },
        {
          id: 'h3',
          name: 'Strength Workout',
          description: '45 mins push/pull or legs routines',
          icon: '',
          color: 'var(--accent-terracotta)',
          streak: 0,
          history: [yStr],
          frequency: '5x a week',
          createdAt: new Date().toISOString()
        },
        {
          id: 'h4',
          name: 'Hydrate Consistently',
          description: 'Drink 3 liters of spring water',
          icon: '',
          color: 'var(--accent-slate)',
          streak: 1,
          history: [tStr],
          frequency: 'Everyday',
          createdAt: new Date().toISOString()
        }
      ];
      setHabits(seededHabits);
      localStorage.setItem('kairos_habits', JSON.stringify(seededHabits));
    }

    if (cachedStudy) {
      setStudySessions(JSON.parse(cachedStudy));
    } else {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const dayBefore = new Date();
      dayBefore.setDate(today.getDate() - 2);

      const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const seededStudy: StudySession[] = [
        {
          id: 's1',
          subject: 'Machine Learning',
          topic: 'Neural Network Weight Backpropagation & Calculus',
          durationGoal: 90,
          date: format(today),
          completed: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 's2',
          subject: 'Design Systems',
          topic: 'Typography Hierarchy, Responsive Scales & HSL variables',
          durationGoal: 60,
          date: format(today),
          completed: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 's3',
          subject: 'Computer Systems',
          topic: 'CPU Cache L1/L2 coherence protocols',
          durationGoal: 120,
          date: format(yesterday),
          completed: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 's4',
          subject: 'Creative Writing',
          topic: 'Pacing and editorial flow in personal essays',
          durationGoal: 45,
          date: format(dayBefore),
          completed: true,
          createdAt: new Date().toISOString()
        }
      ];
      setStudySessions(seededStudy);
      localStorage.setItem('kairos_study', JSON.stringify(seededStudy));
    }

    if (cachedGoals) {
      setGoals(JSON.parse(cachedGoals));
    } else {
      const today = new Date();
      const d1 = new Date(); d1.setDate(today.getDate() + 3);
      const d2 = new Date(); d2.setDate(today.getDate() + 7);
      
      const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const seededGoals: Goal[] = [
        {
          id: 'g1',
          title: 'Deploy Kairos Standalone PWA',
          deadline: format(d1),
          priority: 'high',
          completed: false,
          subTasks: [
            { id: 'gt1', title: 'Add Apple Mobile Web App tags', completed: true },
            { id: 'gt2', title: 'Define premium CSS layout & safe area offsets', completed: true },
            { id: 'gt3', title: 'Implement full local state sync engine', completed: false },
            { id: 'gt4', title: 'Enable offline Safari add guides', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'g2',
          title: 'Finish "Atomic Habits" Reading Log',
          deadline: format(d2),
          priority: 'medium',
          completed: false,
          subTasks: [
            { id: 'gt5', title: 'Obtain hardcover copy', completed: true },
            { id: 'gt6', title: 'Read chapters 1 to 5', completed: false },
            { id: 'gt7', title: 'Write identity-based notes in journal', completed: false }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      setGoals(seededGoals);
      localStorage.setItem('kairos_goals', JSON.stringify(seededGoals));
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

  const updateGoalsState = (updated: Goal[]) => {
    setGoals(updated);
    localStorage.setItem('kairos_goals', JSON.stringify(updated));
  };

  const dismissPwa = () => {
    setPwaDismissed(true);
    localStorage.setItem('kairos_pwa_dismissed', 'true');
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

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

  // Goal/SubTask Toggle Check
  const handleToggleSubtask = (goalId: string, subtaskId: string) => {
    const updated = goals.map(goal => {
      if (goal.id === goalId) {
        const subTasks = goal.subTasks.map(st => {
          if (st.id === subtaskId) {
            return { ...st, completed: !st.completed };
          }
          return st;
        });

        // Determine if all subtasks are complete
        const allCompleted = subTasks.length > 0 && subTasks.every(st => st.completed);
        const completedAt = allCompleted ? getTodayString() : undefined;

        return { ...goal, subTasks, completed: allCompleted, completedAt };
      }
      return goal;
    });
    updateGoalsState(updated);
  };

  // Goal Toggle Completed Manually (even without subtasks)
  const handleToggleGoalCompleted = (goalId: string) => {
    const todayStr = getTodayString();
    const updated = goals.map(goal => {
      if (goal.id === goalId) {
        const nextState = !goal.completed;
        // If completing, also check all subtasks
        const subTasks = goal.subTasks.map(st => ({ ...st, completed: nextState }));
        return { 
          ...goal, 
          completed: nextState, 
          completedAt: nextState ? todayStr : undefined,
          subTasks
        };
      }
      return goal;
    });
    updateGoalsState(updated);
  };

  // Goal Add
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    // Parse sub-tasks from lines of text
    const lines = newGoalSubtasksText.split('\n').filter(line => line.trim() !== '');
    const subTasks: SubTask[] = lines.map((line, idx) => ({
      id: `sub_${Date.now()}_${idx}`,
      title: line.trim(),
      completed: false
    }));

    const newGoal: Goal = {
      id: 'goal_' + Date.now(),
      title: newGoalTitle.trim(),
      deadline: newGoalDeadline,
      priority: newGoalPriority,
      completed: false,
      subTasks,
      createdAt: new Date().toISOString()
    };

    updateGoalsState([newGoal, ...goals]);

    // Clear and close
    setNewGoalTitle('');
    setNewGoalDeadline(getTodayString());
    setNewGoalPriority('medium');
    setNewGoalSubtasksText('');
    setShowGoalModal(false);
  };

  // Goal Add Subtask Inline
  const [inlineSubtaskText, setInlineSubtaskText] = useState<{ [key: string]: string }>({});
  const handleAddInlineSubtask = (goalId: string) => {
    const text = inlineSubtaskText[goalId] || '';
    if (!text.trim()) return;

    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: text.trim(),
      completed: false
    };

    const updated = goals.map(g => {
      if (g.id === goalId) {
        const subTasks = [...g.subTasks, newSub];
        return { ...g, subTasks, completed: false }; // reset completion if new task added
      }
      return g;
    });

    updateGoalsState(updated);
    setInlineSubtaskText({ ...inlineSubtaskText, [goalId]: '' });
  };

  // Goal Delete
  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter(g => g.id !== goalId);
    updateGoalsState(updated);
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

  // Subtasks progress
  const getGoalProgressMetrics = () => {
    const activeGoals = goals.filter(g => !g.completed);
    let completedSub = 0;
    let totalSub = 0;
    activeGoals.forEach(g => {
      g.subTasks.forEach(st => {
        totalSub++;
        if (st.completed) completedSub++;
      });
    });
    return { completedSub, totalSub };
  };
  const { completedSub, totalSub } = getGoalProgressMetrics();

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

  // 3. Goal filters
  const filteredGoals = goals.filter(g => {
    if (goalsFilter === 'all') return true;
    if (goalsFilter === 'completed') return g.completed;
    return g.priority === goalsFilter && !g.completed;
  });

  // 4. Progress page stats
  const activeHabitsCount = habits.length;
  const completedHabitsCount = habits.filter(h => h.history.includes(todayStr)).length;
  const habitsRate = activeHabitsCount > 0 ? Math.round((completedHabitsCount / activeHabitsCount) * 100) : 0;

  const studyTargetHrs = 15;
  const currentStudyHrs = parseFloat(weeklyStudyHours) || 0;
  const studyRate = Math.min(Math.round((currentStudyHrs / studyTargetHrs) * 100), 100);

  const completedGoalsList = goals.filter(g => g.completed);
  const activeGoalsList = goals.filter(g => !g.completed);
  const goalsCount = goals.length;
  const goalsCompletedCount = completedGoalsList.length;
  const goalsRate = goalsCount > 0 ? Math.round((goalsCompletedCount / goalsCount) * 100) : 0;

  // 5. Goal card rendering helper
  const renderGoalCard = (goal: Goal) => {
    const completedSubtasks = goal.subTasks.filter(st => st.completed).length;
    const totalSubtasks = goal.subTasks.length;
    const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (goal.completed ? 100 : 0);
    
    return (
      <div key={goal.id} className="goal-item" style={{ opacity: goal.completed ? 0.78 : 1 }}>
        <div className="goal-header">
          <div className="goal-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4 className="goal-title" style={{ textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {goal.title}
              </h4>
              <span className={`tag tag-${goal.priority}`}>{goal.priority}</span>
            </div>
            <span className="goal-date">
              Deadline: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => handleDeleteGoal(goal.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              aria-label="Delete goal"
            >
              <Trash2 size={15} />
            </button>
            <button 
              className={`btn ${goal.completed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => handleToggleGoalCompleted(goal.id)}
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            >
              {goal.completed ? 'Mark Active' : 'Mark Done'}
            </button>
          </div>
        </div>

        {/* Goal progress metrics */}
        <div className="goal-progress-wrap">
          <div className="goal-progress-bar">
            <div 
              className="goal-progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="goal-progress-info">
            <span className="serif-font" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {progressPercent}% <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Complete</span>
            </span>
            <span>{completedSubtasks} / {totalSubtasks} steps done</span>
          </div>
        </div>

        {/* Subtasks listing */}
        <div>
          <div className="subtasks-title">Action Steps</div>
          {goal.subTasks.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
              No action steps logged. Add one below.
            </p>
          ) : (
            <div className="subtasks-list" style={{ marginBottom: '12px' }}>
              {goal.subTasks.map(sub => (
                <div key={sub.id} className="subtask-item">
                  <div 
                    className={`subtask-checkbox ${sub.completed ? 'checked' : ''}`}
                    onClick={() => handleToggleSubtask(goal.id, sub.id)}
                  >
                    {sub.completed && <Check size={12} />}
                  </div>
                  <span className={`subtask-text ${sub.completed ? 'checked' : ''}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick inline subtask adder */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              className="input-field"
              placeholder="Add action step..."
              value={inlineSubtaskText[goal.id] || ''}
              onChange={(e) => setInlineSubtaskText({ ...inlineSubtaskText, [goal.id]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddInlineSubtask(goal.id);
              }}
              style={{ padding: '6px 12px', fontSize: '0.85rem', flexGrow: 1 }}
            />
            <button 
              className="btn btn-secondary"
              onClick={() => handleAddInlineSubtask(goal.id)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                <h1 className="section-title" style={{ fontSize: '2.2rem' }}>{displayTodayDate}</h1>
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
                    className={`calendar-week-day ${day.isToday ? 'active' : ''}`}
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
                {generateSchedule(dailyTasks, habits).map((item) => {
                  const today = new Date();
                  const currentDecHour = today.getHours() + today.getMinutes() / 60;
                  const isCurrentTime = currentDecHour >= item.startTimeDec && currentDecHour < item.endTimeDec;
                  
                  const isNodeActive = isCurrentTime;
                  const cardActiveClass = isNodeActive ? (item.accentClass === 'coral' ? 'active-coral' : 'active-black') : '';
                  const cardClass = item.isGap ? 'timeline-card is-gap-card' : `timeline-card ${cardActiveClass}`;
                  const nodeClass = `timeline-node ${item.completed ? 'completed' : ''} ${isNodeActive ? 'active' : ''} ${item.isGap ? 'is-gap-node' : ''}`;

                  return (
                    <div key={item.id} className="timeline-item-wrap">
                      <div 
                        className={nodeClass} 
                      />
                      <div className={cardClass}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: item.isGap ? '2px' : '6px' }}>
                          <span className="serif-font" style={{ fontSize: '0.75rem', fontWeight: 700, color: isNodeActive && !item.isGap ? '#FFFFFF' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {item.timeLabel}
                          </span>
                          {!item.isGap && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button 
                                onClick={() => handleDeleteTask(item.id.split('_part_')[0])}
                                style={{ background: 'transparent', border: 'none', color: isNodeActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                                aria-label="Delete task"
                              >
                                <Trash2 size={14} />
                              </button>
                              <div 
                                className={`subtask-checkbox ${item.completed ? 'checked' : ''}`}
                                onClick={() => handleToggleTaskCompleted(item.id.split('_part_')[0])}
                                style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  borderRadius: '50%', 
                                  border: `1.5px solid ${isNodeActive ? '#FFFFFF' : 'var(--border-color)'}`,
                                  backgroundColor: item.completed ? (isNodeActive ? '#FFFFFF' : 'var(--accent-black)') : 'transparent',
                                  color: item.completed ? (isNodeActive ? 'var(--accent-primary)' : '#FFFFFF') : 'transparent'
                                }}
                              >
                                {item.completed && <Check size={12} />}
                              </div>
                            </div>
                          )}
                        </div>
                        <h4 className="serif-font" style={{ fontSize: item.isGap ? '0.92rem' : '1.25rem', fontWeight: item.isGap ? 500 : 600, marginTop: '2px', color: isNodeActive && !item.isGap ? '#FFFFFF' : 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        {!item.isGap && (
                          <p style={{ fontSize: '0.85rem', color: isNodeActive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)', marginTop: '4px' }}>
                            {item.description}
                          </p>
                        )}
                        {item.isGap && item.description && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
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
              TAB: PROGRESS & MILESTONES (Redesigned Goals Section)
              ========================================== */}
          {activeTab === 'goals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h1 className="section-title">Progress Sanctuary</h1>
                  <p className="section-subtitle">Monitor core concentration, habits consistency, and active milestones.</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowGoalModal(true)}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Define Milestone
                </button>
              </div>

              {/* Progress & Momentum Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {/* 1. Habit Rate */}
                <div className="card" style={{ margin: 0, padding: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Practice Consistency
                  </span>
                  <h2 className="serif-font" style={{ fontSize: '1.8rem', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {habitsRate}% <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-secondary)' }}>done</span>
                  </h2>
                  <div className="goal-progress-bar" style={{ height: '3px', marginTop: '8px', marginBottom: '4px' }}>
                    <div className="goal-progress-fill" style={{ width: `${habitsRate}%`, backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{completedHabitsCount} of {activeHabitsCount} completed today</p>
                </div>

                {/* 2. Study Hours */}
                <div className="card" style={{ margin: 0, padding: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Study Concentration
                  </span>
                  <h2 className="serif-font" style={{ fontSize: '1.8rem', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {currentStudyHrs.toFixed(1)}h <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-secondary)' }}>logged</span>
                  </h2>
                  <div className="goal-progress-bar" style={{ height: '3px', marginTop: '8px', marginBottom: '4px' }}>
                    <div className="goal-progress-fill" style={{ width: `${studyRate}%`, backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weekly target: {studyTargetHrs} hours</p>
                </div>

                {/* 3. Goals Rate */}
                <div className="card" style={{ margin: 0, padding: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Milestones Conquered
                  </span>
                  <h2 className="serif-font" style={{ fontSize: '1.8rem', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {goalsCompletedCount}/{goalsCount} <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-secondary)' }}>achieved</span>
                  </h2>
                  <div className="goal-progress-bar" style={{ height: '3px', marginTop: '8px', marginBottom: '4px' }}>
                    <div className="goal-progress-fill" style={{ width: `${goalsRate}%`, backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{goalsRate}% success ({completedSub} / {totalSub} steps)</p>
                </div>
              </div>

              {/* Goal Filters list */}
              <div className="goal-filters">
                <button 
                  className={`goal-filter-btn ${goalsFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setGoalsFilter('all')}
                >
                  All Milestones
                </button>
                <button 
                  className={`goal-filter-btn ${goalsFilter === 'high' ? 'active' : ''}`}
                  onClick={() => setGoalsFilter('high')}
                >
                  High Priority
                </button>
                <button 
                  className={`goal-filter-btn ${goalsFilter === 'medium' ? 'active' : ''}`}
                  onClick={() => setGoalsFilter('medium')}
                >
                  Medium Priority
                </button>
                <button 
                  className={`goal-filter-btn ${goalsFilter === 'low' ? 'active' : ''}`}
                  onClick={() => setGoalsFilter('low')}
                >
                  Low Priority
                </button>
                <button 
                  className={`goal-filter-btn ${goalsFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setGoalsFilter('completed')}
                >
                  ✓ Completed
                </button>
              </div>

              {/* Main List Grid */}
              {filteredGoals.length === 0 ? (
                <div className="card empty-state">
                  <CheckSquare size={36} />
                  <p>No active milestones logged. Define projects to maintain structural goals.</p>
                </div>
              ) : (
                <div>
                  {/* Split Active vs Conquered in 'all' view */}
                  {goalsFilter === 'all' ? (
                    <div>
                      {/* Section: Active */}
                      {activeGoalsList.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <h3 className="serif-font" style={{ fontSize: '1.2rem', fontStyle: 'italic', marginBottom: '12px' }}>Active Milestones</h3>
                          {activeGoalsList.map(goal => renderGoalCard(goal))}
                        </div>
                      )}

                      {/* Section: Conquered */}
                      {completedGoalsList.length > 0 && (
                        <div>
                          <h3 className="serif-font" style={{ fontSize: '1.2rem', fontStyle: 'italic', marginBottom: '12px', color: 'var(--text-muted)' }}>Conquered Milestones</h3>
                          {completedGoalsList.map(goal => renderGoalCard(goal))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {filteredGoals.map(goal => renderGoalCard(goal))}
                    </div>
                  )}
                </div>
              )}
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

      {/* 3. Modal: Add Goal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font">Define Milestone</h3>
              <button className="close-btn" onClick={() => setShowGoalModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddGoal}>
              <div className="input-group">
                <label className="input-label">Milestone Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Deploy React Standalone PWA"
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Priority</label>
                  <select 
                    className="select-field" 
                    value={newGoalPriority} 
                    onChange={e => setNewGoalPriority(e.target.value as any)}
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Deadline</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newGoalDeadline}
                    onChange={e => setNewGoalDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Initial Sub-tasks / Action Steps (one per line)</label>
                <textarea 
                  className="textarea-field" 
                  rows={4} 
                  placeholder="Add Apple Mobile Web App tags&#10;Define custom CSS layout&#10;Implement local state sync"
                  value={newGoalSubtasksText}
                  onChange={e => setNewGoalSubtasksText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGoalModal(false)} style={{ flexGrow: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 2 }}>
                  Establish Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
