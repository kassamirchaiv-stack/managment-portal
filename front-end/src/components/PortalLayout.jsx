import { LogOut } from 'lucide-react';
import Avatar from './Avatar';
import schoolLogo from '../assets/Alene.jpg';

/**
 * PortalLayout:
 * Shared page shell for every role dashboard, styled after the login page:
 * red school header with the Alene seal, an eyebrow + uppercase page title,
 * the dashboard content, and a red footer. `rightExtra` lets a dashboard slot
 * in extra header controls (e.g. the admin notification bell).
 */
const PortalLayout = ({ eyebrow, title, subtitle, user, onLogout, rightExtra, children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-school-canvas text-school-ink">
      <header className="bg-school-red text-white">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={schoolLogo}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-full border-2 border-white/75 bg-white object-cover"
            />
            <span className="truncate text-[13px] font-extrabold uppercase tracking-[0.12em] sm:text-[15px]">
              Alene High School
            </span>
          </div>

          <div className="flex items-center gap-3">
            {rightExtra}
            <div className="hidden items-center gap-2.5 md:flex">
              <Avatar
                src={user?.profile_picture_url}
                name={user?.full_name}
                size="sm"
                className="ring-2 ring-white/60"
              />
              <span className="max-w-[180px] truncate text-xs font-bold text-white/90">
                {user?.full_name}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex min-h-10 items-center gap-2 border border-white/65 px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10 cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-school-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
          <div className="flex items-center gap-4 text-xs font-extrabold uppercase tracking-[0.2em] text-school-red">
            <span className="h-0.5 w-12 bg-current" />
            <span>{eyebrow}</span>
          </div>
          <h1 className="mt-5 text-[clamp(32px,5vw,52px)] font-black uppercase leading-[0.98] tracking-[-0.06em] text-school-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-sm text-school-muted">{subtitle}</p>}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">{children}</main>

      <footer className="bg-school-red text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-extrabold uppercase tracking-[0.12em]">Alene High School</span>
          <span className="text-white/78">Learning together, every day.</span>
        </div>
      </footer>
    </div>
  );
};

export default PortalLayout;
