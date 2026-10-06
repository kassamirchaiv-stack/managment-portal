import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import api from '../api/api';
import CourseLoad from '../components/CourseLoad';
import PortalLayout from '../components/PortalLayout';
import {
  GraduationCap,
  BookOpen,
  Award,
  ShieldCheck,
  Calendar,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

/**
 * ParentDashboard Component:
 * Displays student records for linked children across 4 tabs:
 * 1. Academic Progress (Report Cards table)
 * 2. Activities & Involvement (Clubs & Sports list)
 * 3. Daily Discipline & Behavior (Timeline of published reviews with color-coded badges)
 */
const ParentDashboard = () => {
  const { user, logout } = useAuth();

  // State management
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childDetails, setChildDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('academic'); // 'academic' | 'activities' | 'discipline'
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /**
   * 1. Initial Load: Fetch list of children linked to current parent
   */
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await api.get('/api/parent/children');
        setChildren(response.data);
        if (response.data.length > 0) {
          // Automatically select first child
          setSelectedChildId(response.data[0].student_id);
        }
      } catch (err) {
        console.error('Error fetching parent children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildren();
  }, []);

  /**
   * 2. Child Selection Change: Fetch selected child's report cards & published discipline logs
   */
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchChildDetails = async () => {
      setLoadingDetails(true);
      try {
        const response = await api.get(`/api/parent/child/${selectedChildId}`);
        setChildDetails(response.data);
      } catch (err) {
        console.error(`Error fetching details for child ${selectedChildId}:`, err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchChildDetails();
  }, [selectedChildId]);

  // Current selected child summary
  const currentChild = children.find((c) => c.student_id === Number(selectedChildId));

  /**
   * Helper function: Returns badge styling based on discipline incident category
   * Green: Commendation / Positive
   * Yellow: Tardiness / Note
   * Red: Incident / Bullying / Disruption
   */
  const getCategoryBadgeStyle = (category) => {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('commendation') || catLower.includes('praise') || catLower.includes('positive')) {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        icon: <CheckCircle2 size={16} className="text-emerald-600" />,
        type: 'Commendation',
      };
    } else if (catLower.includes('tardiness') || catLower.includes('note') || catLower.includes('warning')) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        icon: <Clock size={16} className="text-amber-600" />,
        type: 'Note',
      };
    } else {
      return {
        bg: 'bg-school-red-soft border-school-red/25 text-school-red-dark',
        icon: <AlertTriangle size={16} className="text-school-red" />,
        type: 'Incident',
      };
    }
  };

  /**
   * Helper function: Returns grade badge color
   */
  const getGradeBadgeStyle = (grade) => {
    if (grade.startsWith('A')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (grade.startsWith('B')) return 'bg-school-blue-soft text-school-blue border-school-blue/25';
    if (grade.startsWith('C')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-school-soft text-slate-600 border-school-line';
  };

  // Mock Extracurricular Activities Data for Tab 2
  const mockActivities = [
    {
      id: 1,
      name: 'Science Olympiad & Chemistry Club',
      category: 'Academic Club',
      role: 'Active Team Member',
      schedule: 'Tuesdays & Thursdays (3:30 PM - 5:00 PM)',
      supervisor: 'Dr. Arthur Vance',
    },
    {
      id: 2,
      name: 'Varsity Athletics & Track',
      category: 'Sports',
      role: 'Team Captain (Sprinter)',
      schedule: 'Mon, Wed, Fri (4:00 PM - 6:00 PM)',
      supervisor: 'Coach Marcus Reed',
    },
    {
      id: 3,
      name: 'Student Debate Society',
      category: 'Leadership & Public Speaking',
      role: 'Junior Delegate',
      schedule: 'Wednesdays (3:30 PM - 4:30 PM)',
      supervisor: 'Eleanor Vance',
    },
  ];

  return (
    <PortalLayout
      eyebrow="Family portal"
      title="Parent Portal"
      subtitle={`Welcome, ${user?.full_name || ''}`}
      user={user}
      onLogout={logout}
    >

        {/* CHILD HEADER & SELECTOR CARD */}
        {loadingChildren ? (
          <div className="p-8 bg-white border border-school-line text-center text-school-muted shadow-sm">
            Loading child profiles...
          </div>
        ) : children.length === 0 ? (
          <div className="p-8 bg-white border border-school-line text-center text-school-muted shadow-sm">
            No children currently linked to this parent account.
          </div>
        ) : (
          <div className="p-6 bg-white border border-school-line border-t-[3px] border-t-school-red shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-school-blue text-white flex items-center justify-center shadow-md font-semibold text-2xl">
                <GraduationCap size={32} />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-school-ink tracking-tight">
                    {childDetails?.student?.full_name || currentChild?.full_name}
                  </h2>
                  <span className="px-3 py-1 bg-school-blue-soft text-school-blue border border-school-blue/25 text-[11px] font-extrabold uppercase tracking-[0.08em]">
                    {childDetails?.student?.grade_level || currentChild?.grade_level}
                  </span>
                </div>
                <p className="text-xs text-school-muted mt-1 flex items-center space-x-2">
                  <span>Student ID: #{selectedChildId}</span>
                  <span>•</span>
                  <span>{childDetails?.student?.email || currentChild?.email}</span>
                </p>
              </div>
            </div>

            {/* Child Dropdown Selector (if parent has multiple children) */}
            {children.length > 1 && (
              <div className="relative">
                <label className="block text-[10px] uppercase tracking-[0.18em] text-school-red font-extrabold mb-1">
                  Select Child
                </label>
                <div className="relative">
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(Number(e.target.value))}
                    className="appearance-none bg-white border border-school-input text-school-ink text-sm min-h-12 pl-3.5 pr-10 py-3 focus:outline-none focus:border-school-blue focus:ring-[3px] focus:ring-school-blue/15 cursor-pointer"
                  >
                    {children.map((c) => (
                      <option key={c.student_id} value={c.student_id}>
                        {c.full_name} ({c.grade_level})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB NAVIGATION BAR */}
        <div className="flex border-b border-school-line gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('academic')}
            className={`flex items-center space-x-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors border-b-[3px] cursor-pointer whitespace-nowrap ${
              activeTab === 'academic'
                ? 'bg-white text-school-red border-school-red'
                : 'text-school-muted hover:text-school-ink border-transparent hover:bg-white/70'
            }`}
          >
            <BookOpen size={18} />
            <span>Tab 1: Academic Progress</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center space-x-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors border-b-[3px] cursor-pointer whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-white text-school-red border-school-red'
                : 'text-school-muted hover:text-school-ink border-transparent hover:bg-white/70'
            }`}
          >
            <Award size={18} />
            <span>Tab 2: Activities & Involvement</span>
          </button>

          <button
            onClick={() => setActiveTab('discipline')}
            className={`flex items-center space-x-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors border-b-[3px] cursor-pointer whitespace-nowrap ${
              activeTab === 'discipline'
                ? 'bg-white text-school-red border-school-red'
                : 'text-school-muted hover:text-school-ink border-transparent hover:bg-white/70'
            }`}
          >
            <ShieldCheck size={18} />
            <span>Tab 3: Daily Discipline & Behavior</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center space-x-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors border-b-[3px] cursor-pointer whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-white text-school-red border-school-red'
                : 'text-school-muted hover:text-school-ink border-transparent hover:bg-white/70'
            }`}
          >
            <Layers size={18} />
            <span>Tab 4: Course Load</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="bg-white border border-school-line border-t-[3px] border-t-school-red p-6 min-h-[350px] shadow-card">
          {activeTab === 'courses' ? (
            selectedChildId && (
              <CourseLoad apiUrl={`/api/parent/child/${selectedChildId}/courses`} />
            )
          ) : loadingDetails ? (
            <div className="py-12 text-center text-school-muted flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-school-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Fetching student records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ACADEMIC PROGRESS */}
              {activeTab === 'academic' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">Academic Report Cards</h3>
                      <p className="text-xs text-school-muted">Current term grades and instructor comments</p>
                    </div>
                  </div>

                  {!childDetails?.report_cards || childDetails.report_cards.length === 0 ? (
                    <div className="py-12 text-center text-school-muted bg-school-soft border border-school-line">
                      No academic report card records found for this student.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-school-line">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-school-soft text-school-muted uppercase text-[10px] font-extrabold tracking-[0.16em] border-b border-school-line">
                          <tr>
                            <th className="px-5 py-3.5">Subject</th>
                            <th className="px-5 py-3.5">Term</th>
                            <th className="px-5 py-3.5">Grade</th>
                            <th className="px-5 py-3.5">Teacher Comments</th>
                            <th className="px-5 py-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-school-line bg-white">
                          {childDetails.report_cards.map((rc) => (
                            <tr key={rc.id} className="hover:bg-school-soft transition-colors">
                              <td className="px-5 py-4 font-semibold text-school-ink">{rc.subject}</td>
                              <td className="px-5 py-4 text-school-muted text-xs">{rc.term}</td>
                              <td className="px-5 py-4">
                                <span className={`inline-block px-3 py-1 text-xs font-bold border ${getGradeBadgeStyle(rc.grade)}`}>
                                  {rc.grade}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-slate-600 text-xs max-w-xs leading-relaxed">
                                {rc.teacher_comments || 'No comments added.'}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {rc.status === 'ADMIN_APPROVED' ? 'Approved' : rc.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACTIVITIES & INVOLVEMENT */}
              {activeTab === 'activities' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">Activities & Extracurricular Involvement</h3>
                    <p className="text-xs text-school-muted">School clubs, sports teams, and leadership roles</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {mockActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-5 bg-white border border-school-line hover:border-school-blue hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-extrabold tracking-[0.14em] px-2.5 py-1 bg-school-blue-soft text-school-blue border border-school-blue/25">
                              {act.category}
                            </span>
                            <span className="text-xs text-school-muted flex items-center space-x-1">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{act.schedule}</span>
                            </span>
                          </div>

                          <h4 className="text-base font-semibold text-school-ink mt-1">{act.name}</h4>
                          <p className="text-xs text-school-blue font-medium mt-1">Role: {act.role}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-school-muted flex items-center justify-between">
                          <span>Faculty Supervisor: {act.supervisor}</span>
                          <span className="text-emerald-600 font-medium text-[11px]">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DAILY DISCIPLINE & BEHAVIOR TIMELINE */}
              {activeTab === 'discipline' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">Daily Discipline & Behavior Timeline</h3>
                    <p className="text-xs text-school-muted">
                      Published daily reviews and behavior logs (Only admin-approved published logs are visible here)
                    </p>
                  </div>

                  {!childDetails?.discipline_reviews || childDetails.discipline_reviews.length === 0 ? (
                    <div className="py-12 text-center text-school-muted bg-school-soft border border-school-line">
                      No published discipline or behavior logs for this student.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-school-line">
                      {childDetails.discipline_reviews.map((log) => {
                        const badge = getCategoryBadgeStyle(log.category);
                        return (
                          <div key={log.id} className="relative group">
                            {/* Timeline Node Icon */}
                            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-school-blue group-hover:scale-110 transition-transform"></div>

                            {/* Log Item Card */}
                            <div className="p-5 bg-white border border-school-line space-y-3 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold border ${badge.bg}`}>
                                    {badge.icon}
                                    <span>{log.category} ({badge.type})</span>
                                  </span>
                                </div>
                                <span className="text-xs text-school-muted flex items-center space-x-1">
                                  <Calendar size={13} className="text-slate-400" />
                                  <span>{log.incident_date}</span>
                                </span>
                              </div>

                              <p className="text-sm text-slate-700 leading-relaxed bg-school-soft p-3 border border-school-line">
                                "{log.description}"
                              </p>

                              <div className="flex items-center justify-between text-xs text-school-muted pt-1">
                                <span>Logged by: {log.logged_by_teacher}</span>
                                <span className="text-emerald-600 font-medium text-[11px] flex items-center space-x-1">
                                  <CheckCircle2 size={12} />
                                  <span>Approved & Published</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
    </PortalLayout>
  );
};

export default ParentDashboard;
