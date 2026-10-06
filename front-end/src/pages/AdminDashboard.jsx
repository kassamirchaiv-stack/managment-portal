import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import api from '../api/api';
import PortalLayout from '../components/PortalLayout';
import Avatar from '../components/Avatar';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  Bell,
  UserCog,
  Check,
  X,
} from 'lucide-react';

/**
 * AdminDashboard Component (Principal Approval Queue):
 * Renders the pending discipline queue containing teacher-logged incident reports,
 * and a notification queue of student profile edit requests awaiting approval.
 * Allows the Principal (ADMIN_PRINCIPAL) to review and approve/publish/apply both in real-time.
 */
const AdminDashboard = () => {
  const { user, logout } = useAuth();

  // Discipline queue state
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  // Student profile change request (notification) state
  const [bioRequests, setBioRequests] = useState([]);
  const [loadingBioRequests, setLoadingBioRequests] = useState(true);
  const [bioActionId, setBioActionId] = useState(null);

  const [reportCards, setReportCards] = useState([]);
  const [loadingReportCards, setLoadingReportCards] = useState(true);
  const [reportCardActionId, setReportCardActionId] = useState(null);
  const [queueLoadError, setQueueLoadError] = useState('');

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const loadQueues = async () => {
      const [disciplineResult, bioResult, reportCardResult] = await Promise.allSettled([
        api.get('/api/admin/discipline-queue'),
        api.get('/api/admin/bio-change-requests'),
        api.get('/api/admin/report-card-queue'),
      ]);
      if (!active) return;
      if (disciplineResult.status === 'fulfilled') setQueue(disciplineResult.value.data);
      else console.error('Error fetching admin discipline queue:', disciplineResult.reason);
      if (bioResult.status === 'fulfilled') setBioRequests(bioResult.value.data);
      else console.error('Error fetching bio change requests:', bioResult.reason);
      if (reportCardResult.status === 'fulfilled') setReportCards(reportCardResult.value.data);
      else console.error('Error fetching report-card queue:', reportCardResult.reason);
      if (
        disciplineResult.status === 'rejected'
        || bioResult.status === 'rejected'
        || reportCardResult.status === 'rejected'
      ) {
        setQueueLoadError('Some approval queues could not be loaded. Refresh the page to retry.');
      }
      setLoading(false);
      setLoadingBioRequests(false);
      setLoadingReportCards(false);
    };
    loadQueues();
    return () => {
      active = false;
    };
  }, []);

  const notificationCount = queue.length + bioRequests.length + reportCards.length;

  const handleReportCardAction = async (reportCardId, action) => {
    setReportCardActionId(reportCardId);
    try {
      await api.patch(`/api/admin/report-card/${reportCardId}/${action}`);
      setReportCards((previous) => previous.filter((card) => card.id !== reportCardId));
      setToastMessage(
        action === 'approve'
          ? 'Report card approved and published to the student and parent.'
          : 'Report card returned to the teacher for revision.'
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(`Report-card ${action} failed for #${reportCardId}:`, err);
      alert(`Failed to ${action} the report card. Please try again.`);
    } finally {
      setReportCardActionId(null);
    }
  };

  /**
   * 3. Approve & Publish handler:
   * Invokes PATCH /api/admin/discipline/{id}/approve
   * Updates state in real-time by removing the approved item from the queue list.
   */
  const handleApproveAndPublish = async (id, studentName) => {
    setApprovingId(id);
    try {
      await api.patch(`/api/admin/discipline/${id}/approve`);

      // Real-time state update: filter out approved review
      setQueue((prevQueue) => prevQueue.filter((item) => item.id !== id));

      // Show temporary success toast feedback
      setToastMessage(`Discipline review for ${studentName} successfully approved and published to Parent Portal!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(`Approval failed for log #${id}:`, err);
      alert('Failed to approve discipline log. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  /**
   * 4. Approve/Reject handler for student profile edit requests.
   */
  const handleBioRequestAction = async (studentId, studentName, action) => {
    setBioActionId(studentId);
    try {
      await api.patch(`/api/admin/bio-change/${studentId}/${action}`);

      setBioRequests((prev) => prev.filter((r) => r.student_id !== studentId));

      setToastMessage(
        action === 'approve'
          ? `Profile update for ${studentName} approved and applied.`
          : `Profile update request for ${studentName} rejected.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(`Bio change ${action} failed for student #${studentId}:`, err);
      alert(`Failed to ${action} the profile change request. Please try again.`);
    } finally {
      setBioActionId(null);
    }
  };

  return (
    <PortalLayout
      eyebrow="Principal portal"
      title="Approvals & reviews"
      subtitle={`Signed in as ${user?.full_name || ''} (Principal)`}
      user={user}
      onLogout={logout}
      rightExtra={
        <div className="relative">
          <div className="w-10 h-10 border border-white/65 flex items-center justify-center text-white">
            <Bell size={18} />
          </div>
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-school-red text-[10px] font-extrabold flex items-center justify-center border-2 border-school-red">
              {notificationCount}
            </span>
          )}
        </div>
      }
    >

        {/* REAL-TIME SUCCESS TOAST FEEDBACK */}
        {toastMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 border-l-[3px] border-l-emerald-600 text-emerald-700 text-sm font-medium flex items-center space-x-3 shadow-sm animate-fade-in">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {queueLoadError && (
          <div role="alert" className="border border-school-red/20 border-l-[3px] border-l-school-red bg-school-red-soft p-4 text-sm text-school-red-dark">
            {queueLoadError}
          </div>
        )}

        {/* STUDENT PROFILE CHANGE REQUESTS (NOTIFICATIONS) CARD */}
        <div className="bg-white border border-school-line border-t-[3px] border-t-school-red p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-school-line pb-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink flex items-center space-x-2">
                <UserCog className="text-school-blue" size={20} />
                <span>Student Profile Change Requests</span>
              </h2>
              <p className="text-xs text-school-muted mt-0.5">
                Students requesting edits to their name or email on file
              </p>
            </div>

            <span className="px-3 py-1 bg-school-blue-soft text-school-blue border border-school-blue/25 text-[11px] font-extrabold uppercase tracking-[0.08em]">
              {bioRequests.length} Pending
            </span>
          </div>

          {loadingBioRequests ? (
            <div className="py-10 text-center text-school-muted flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-school-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Loading profile change requests...</p>
            </div>
          ) : bioRequests.length === 0 ? (
            <div className="py-10 text-center text-school-muted bg-school-soft border border-school-line space-y-2">
              <CheckCircle2 size={30} className="mx-auto text-emerald-500 opacity-70" />
              <p className="text-xs text-school-muted">No pending student profile change requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bioRequests.map((req) => (
                <div
                  key={req.student_id}
                  className="p-5 bg-white border border-school-line hover:border-school-blue hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={req.current_full_name} size="sm" />
                      <h3 className="text-base font-bold text-school-ink">{req.current_full_name}</h3>
                    </div>
                    <p className="text-xs text-school-muted">
                      Grade: <span className="text-slate-700">{req.grade_level}</span>
                    </p>

                    <div className="bg-school-soft p-3.5 border border-school-line text-xs text-slate-700 leading-relaxed space-y-1">
                      <div>
                        <span className="text-slate-400">Name: </span>
                        <span className="line-through text-slate-400">{req.current_full_name}</span>
                        {' → '}
                        <span className="text-school-blue font-semibold">
                          {req.requested_changes?.full_name || '(unchanged)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Email: </span>
                        <span className="line-through text-slate-400">{req.current_email}</span>
                        {' → '}
                        <span className="text-school-blue font-semibold">
                          {req.requested_changes?.email || '(unchanged)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleBioRequestAction(req.student_id, req.current_full_name, 'approve')}
                      disabled={bioActionId === req.student_id}
                      className="w-full md:w-auto px-4 py-2.5 bg-school-blue hover:bg-school-blue-dark text-white text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleBioRequestAction(req.student_id, req.current_full_name, 'reject')}
                      disabled={bioActionId === req.student_id}
                      className="w-full md:w-auto px-4 py-2.5 bg-white hover:border-school-red hover:text-school-red text-school-ink text-[11px] font-extrabold uppercase tracking-[0.12em] border border-school-line transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-school-line border-t-[3px] border-t-school-red p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-school-line pb-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink">Pending Report Cards</h2>
              <p className="text-xs text-school-muted mt-0.5">
                Review teacher-submitted grades before they appear in student and parent portals
              </p>
            </div>
            <span className="px-3 py-1 bg-school-blue-soft text-school-blue border border-school-blue/25 text-[11px] font-extrabold uppercase tracking-[0.08em]">
              {reportCards.length} Pending
            </span>
          </div>
          {loadingReportCards ? (
            <p className="py-8 text-center text-sm text-school-muted">Loading report cards...</p>
          ) : reportCards.length === 0 ? (
            <p className="py-8 text-center text-sm text-school-muted">No report cards awaiting review.</p>
          ) : (
            <div className="space-y-3">
              {reportCards.map((card) => (
                <div key={card.id} className="flex flex-col gap-3 border border-school-line p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-school-ink">{card.student_name} · {card.grade_level}</p>
                    <p className="text-sm text-slate-600">{card.term} · {card.subject} · Grade {card.grade}</p>
                    {card.teacher_comments && (
                      <p className="mt-1 text-sm text-school-muted">{card.teacher_comments}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReportCardAction(card.id, 'approve')}
                      disabled={reportCardActionId === card.id}
                      className="bg-school-blue px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-school-blue-dark transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReportCardAction(card.id, 'reject')}
                      disabled={reportCardActionId === card.id}
                      className="border border-school-line px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-school-ink hover:border-school-red hover:text-school-red transition-colors disabled:opacity-50"
                    >
                      Return for revision
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRINCIPAL APPROVAL QUEUE CARD */}
        <div className="bg-white border border-school-line border-t-[3px] border-t-school-red p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-school-line pb-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.04em] text-school-ink flex items-center space-x-2">
                <Clock className="text-amber-500" size={20} />
                <span>Pending Discipline Review Queue</span>
              </h2>
              <p className="text-xs text-school-muted mt-0.5">
                Review incident drafts submitted by teachers before publishing to parents
              </p>
            </div>

            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-extrabold uppercase tracking-[0.08em]">
              {queue.length} Pending
            </span>
          </div>

          {/* QUEUE CONTENT */}
          {loading ? (
            <div className="py-12 text-center text-school-muted flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Loading pending queue items...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center text-school-muted bg-school-soft border border-school-line space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-70" />
              <h3 className="text-base font-semibold text-slate-700">Approval Queue is Clear</h3>
              <p className="text-xs text-school-muted max-w-sm mx-auto">
                All teacher-submitted discipline logs have been reviewed and published.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 bg-white border border-school-line hover:border-school-blue hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left Column: Log Information */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        {item.category}
                      </span>
                      <span className="text-xs text-school-muted flex items-center space-x-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Incident Date: {item.incident_date}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Avatar name={item.student_name} size="sm" />
                      <div>
                        <h3 className="text-base font-bold text-school-ink flex items-center space-x-2">
                          <span>{item.student_name}</span>
                          <span className="text-xs text-school-blue font-normal px-2 py-0.5 bg-school-blue-soft border border-school-blue/25">
                            {item.grade_level}
                          </span>
                        </h3>
                        <p className="text-xs text-school-muted mt-0.5">
                          Logged by <span className="text-slate-700 font-medium">{item.teacher_name}</span>
                        </p>
                      </div>
                    </div>

                    {/* Teacher Notes / Description */}
                    <div className="bg-school-soft p-3.5 border border-school-line text-xs text-slate-700 leading-relaxed">
                      <span className="text-[10px] uppercase font-extrabold tracking-[0.14em] text-slate-400 block mb-1">
                        Teacher Notes:
                      </span>
                      "{item.description}"
                    </div>
                  </div>

                  {/* Right Column: Approve & Publish Action */}
                  <div className="flex md:flex-col items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleApproveAndPublish(item.id, item.student_name)}
                      disabled={approvingId === item.id}
                      className="w-full md:w-auto px-5 py-3 bg-school-blue hover:bg-school-blue-dark text-white text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {approvingId === item.id ? (
                        <span>Publishing...</span>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Approve & Publish to Parent</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </PortalLayout>
  );
};

export default AdminDashboard;
