import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import schoolLogo from '../assets/Alene.jpg';
import './Login.css';

// The public Alene High School website, linked from the portal so visitors can
// get back to it.
const SCHOOL_SITE_URL =
  import.meta.env.VITE_SCHOOL_SITE_URL || 'https://alene-highschool-website.vercel.app';

const ROLE_ROUTES = {
  ADMIN_PRINCIPAL: '/admin',
  TEACHER: '/teacher',
  PARENT: '/parent',
  STUDENT: '/student',
};

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'ADMIN_PRINCIPAL', label: 'Principal' },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, logout, loading: authLoading, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (userRole) => {
    navigate(ROLE_ROUTES[userRole] || '/');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(identifier, password);
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    if (result.role !== selectedRole) {
      await logout();
      setError(
        `This account is not registered as a ${ROLE_OPTIONS.find((role) => role.value === selectedRole)?.label}. Please check your selection.`
      );
      setIsSubmitting(false);
      return;
    }

    redirectByRole(result.role);
    setIsSubmitting(false);
  };

  // Already signed in (e.g. reopening /login): go straight to the dashboard.
  // Skipped mid-submit so a wrong-role sign-in can still be logged out.
  if (isAuthenticated && !isSubmitting && ROLE_ROUTES[role]) {
    return <Navigate to={ROLE_ROUTES[role]} replace />;
  }

  const identifierLabel = selectedRole === 'STUDENT' ? 'Student ID Number' : 'Username';
  const identifierPlaceholder =
    selectedRole === 'STUDENT' ? 'Enter your student ID' : 'Enter your username';

  return (
    <div className="school-home">
      <main className="school-portal" aria-labelledby="portal-title">
        <div className="school-portal__intro">
          <a className="school-portal__back" href={SCHOOL_SITE_URL}>
            <ArrowLeft size={16} /> Back to Alene High School
          </a>
          <div className="school-eyebrow school-eyebrow--light">
            <span className="school-eyebrow__rule" />
            <span>Alene school portal</span>
          </div>
          <h1 id="portal-title">Your school,<br /><span>all in one place.</span></h1>
          <p>
            Sign in to access the right space for students, families, teachers,
            and school leaders.
          </p>
          <div className="school-portal__seal">
            <img src={schoolLogo} alt="Alene High School seal" />
            <span>Learning together<br />at Alene High School</span>
          </div>
        </div>

        <div className="school-login-card">
          <div className="school-login-card__heading">
            <span className="school-kicker">Welcome back</span>
            <h2>Sign in to your account</h2>
            <p>Choose your role, then enter your sign-in details.</p>
          </div>

          {error && <div className="school-login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="school-login-form">
            <fieldset className="school-role-fieldset">
              <legend>Who is logging in?</legend>
              <div className="school-role-options">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role.value}
                    className={`school-role-option${selectedRole === role.value ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={() => setSelectedRole(role.value)}
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="school-form-label" htmlFor="portal-identifier">{identifierLabel}</label>
            <input
              id="portal-identifier"
              className="school-form-input"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={identifierPlaceholder}
            />

            <label className="school-form-label" htmlFor="portal-password">Password</label>
            <div className="school-password-wrap">
              <input
                id="portal-password"
                className="school-form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="school-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="submit"
              className="school-button school-button--blue school-login-submit"
              disabled={isSubmitting || authLoading}
            >
              {authLoading ? 'Checking session…' : isSubmitting ? 'Signing in…' : 'Sign in to portal'}
              {!authLoading && !isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
