import { useEffect, useState } from 'react';
import api from '../api/api';
import { Phone, Mail, X, AlertCircle, Layers } from 'lucide-react';
import Avatar from './Avatar';
import TeacherPopover from './TeacherPopover';

/**
 * CourseLoad Component:
 * Shows a student's enrolled courses and the teacher who leads each one.
 * Hovering a teacher's name/avatar shows a contact popover card; clicking
 * opens a full profile modal (bio, phone, optional email) in the middle
 * of the screen.
 *
 * Shared between ParentDashboard (viewing a child's courses) and StudentDashboard
 * (viewing their own courses) - only the `apiUrl` differs between the two.
 */
const CourseLoad = ({ apiUrl }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalCourse, setModalCourse] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get(apiUrl);
        if (!cancelled) setCourses(res.data);
      } catch (err) {
        console.error('Error fetching course load:', err);
        if (!cancelled) {
          setLoadError(err.response?.data?.detail || 'Failed to load course list.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (apiUrl) fetchCourses();

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">Course Load</h3>
        <p className="text-xs text-school-muted">Enrolled courses and the teachers who lead them</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-school-muted flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-school-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Loading course load...</p>
        </div>
      ) : loadError ? (
        <div className="py-8 px-5 text-center text-school-red bg-school-red-soft border border-school-red/20 border-l-[3px] border-l-school-red flex flex-col items-center gap-2">
          <AlertCircle size={22} />
          <p className="text-sm">{loadError}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="py-12 text-center text-school-muted bg-school-soft border border-school-line">
          No courses found for this grade level yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 bg-white border border-school-line hover:border-school-blue hover:shadow-md transition-all"
            >
              <span className="text-[10px] uppercase font-extrabold tracking-[0.14em] px-2.5 py-1 bg-school-blue-soft text-school-blue border border-school-blue/25">
                {course.subject}
              </span>
              <h4 className="text-base font-semibold text-school-ink mt-2">{course.name}</h4>

              {course.teacher ? (
                <TeacherPopover teacher={course.teacher}>
                  <button
                    type="button"
                    onClick={() => setModalCourse(course)}
                    className="mt-3 flex items-center gap-2 cursor-pointer group"
                  >
                    <Avatar src={course.teacher.profile_picture_url} name={course.teacher.full_name} size="xs" />
                    <span className="text-xs font-medium text-school-blue group-hover:text-school-blue-dark underline decoration-dotted decoration-school-blue/40 underline-offset-2">
                      {course.teacher.full_name}
                    </span>
                  </button>
                </TeacherPopover>
              ) : (
                <p className="text-xs text-slate-400 mt-3">No teacher assigned yet.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalCourse && <TeacherProfileModal course={modalCourse} onClose={() => setModalCourse(null)} />}
    </div>
  );
};

/**
 * TeacherProfileModal:
 * Full teacher profile popup shown when a course's teacher name is clicked.
 */
const TeacherProfileModal = ({ course, onClose }) => {
  const teacher = course.teacher;

  return (
    <div
      className="fixed inset-0 bg-school-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-school-line shadow-card p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={teacher.profile_picture_url} name={teacher.full_name} size="lg" />
            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">{teacher.full_name}</h3>
              <p className="text-xs text-school-muted flex items-center gap-1.5 mt-1">
                <Layers size={13} className="text-school-blue" />
                <span>
                  {course.name} ({course.subject})
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed bg-school-soft p-3.5 border border-school-line">
          {teacher.bio || 'No description provided yet.'}
        </p>

        <div className="space-y-2.5">
          {teacher.phone ? (
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <Phone size={15} className="text-school-blue flex-shrink-0" />
              <span>{teacher.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>No phone number on file.</span>
            </div>
          )}

          {(teacher.contact_email || teacher.email) && (
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <Mail size={15} className="text-school-blue flex-shrink-0" />
              <span>{teacher.contact_email || teacher.email}</span>
            </div>
          )}
        </div>

        {(teacher.contact_email || teacher.email) && (
          <a
            href={`mailto:${teacher.contact_email || teacher.email}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-school-blue hover:bg-school-blue-dark text-white text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <Mail size={14} />
            <span>Email {teacher.full_name.split(' ')[0]}</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default CourseLoad;
