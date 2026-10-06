import { useState } from 'react';
import { Mail, Phone, Clock, BookOpen } from 'lucide-react';
import Avatar from './Avatar';

/**
 * TeacherPopover:
 * Wraps a trigger element (a teacher's name or avatar). On hover, shows a
 * smooth popover card with the teacher's full contact profile.
 * Used in the Parent Dashboard contact/course section and the Student
 * course/teacher list.
 */
const TeacherPopover = ({ teacher, children }) => {
  const [open, setOpen] = useState(false);

  if (!teacher) return children;

  const email = teacher.contact_email || teacher.email;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      <div
        className={`absolute z-20 bottom-full left-0 mb-2 w-72 origin-bottom-left transition-all duration-150 ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-white border border-school-line shadow-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar src={teacher.profile_picture_url} name={teacher.full_name} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-school-ink truncate">{teacher.full_name}</p>
              {teacher.subject && (
                <p className="text-xs text-school-blue flex items-center gap-1 truncate">
                  <BookOpen size={12} />
                  <span>{teacher.subject}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {teacher.bio || 'No description provided yet.'}
          </p>

          <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
            {email && (
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-school-blue flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {teacher.phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-school-blue flex-shrink-0" />
                <span>{teacher.phone}</span>
              </div>
            )}
            {teacher.office_hours && (
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-school-blue flex-shrink-0" />
                <span>{teacher.office_hours}</span>
              </div>
            )}
          </div>

          {email && (
            <a
              href={`mailto:${email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-school-blue hover:bg-school-blue-dark text-white text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Mail size={13} />
              <span>Send Message</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherPopover;
