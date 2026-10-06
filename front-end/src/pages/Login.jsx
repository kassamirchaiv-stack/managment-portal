import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import schoolLogo from '../assets/Alene.jpg';
import './Login.css';

// The public Alene High School website, linked from the portal so visitors can
// get back to it.
const SCHOOL_SITE_URL =
  import.meta.env.VITE_SCHOOL_SITE_URL || 'https://alene-highschool-website.vercel.app';

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'ADMIN_PRINCIPAL', label: 'Principal' },
];

const Login = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (userRole) => {
    const routes = {
      ADMIN_PRINCIPAL: '/admin',
      TEACHER: '/teacher',
      PARENT: '/parent',
      STUDENT: '/student',
    };
    navigate(routes[userRole] || '/');
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

  const setDemoCredentials = (demoUsername, role) => {
    setIdentifier(demoUsername);
    setPassword('password123');
    setSelectedRole(role);
    setError('');
  };

  const identifierLabel = selectedRole === 'STUDENT' ? 'Student ID Number' : 'Username';
  const identifierPlaceholder =
    selectedRole === 'STUDENT' ? 'Enter your student ID' : 'Enter your username';

  return (
    <div className="school-home">
      <header className="school-site-header">
        <a className="school-site-brand" href="#home" aria-label="Alene High School home">
          <img src={schoolLogo} alt="" />
          <span>Alene High School</span>
        </a>
        <button
          className="school-menu-toggle"
          type="button"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
        <nav className={`school-site-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <a href="#stem" onClick={() => setIsMenuOpen(false)}>STEM at Alene</a>
          <a href="#community" onClick={() => setIsMenuOpen(false)}>Community</a>
          <a href="#achievements" onClick={() => setIsMenuOpen(false)}>Achievements</a>
          <a className="school-nav-login" href="#portal-login" onClick={() => setIsMenuOpen(false)}>
            Portal sign in <ArrowRight size={15} />
          </a>
        </nav>
      </header>

      <main id="home">
        <section className="school-hero" aria-labelledby="home-title">
          <div className="school-hero__copy">
            <div className="school-eyebrow">
              <span className="school-hero__number">01</span>
              <span className="school-eyebrow__rule" />
              <span>Alene High School</span>
            </div>
            <h1 id="home-title">Excellence<br />in science</h1>
            <p className="school-hero__tagline">Through collective effort.</p>
            <p className="school-hero__description">
              A place to ask bigger questions, learn by doing, and grow together.
              Welcome to the Alene High School community.
            </p>
            <div className="school-hero__actions">
              <a className="school-button school-button--blue" href="#stem">
                Discover Alene <ArrowRight size={16} />
              </a>
              <a className="school-text-link" href="#portal-login">
                Go to the school portal <ArrowDown size={14} />
              </a>
            </div>
          </div>
          <span className="school-hero__side-note" aria-hidden="true">Learn · Explore · Together</span>
          <span className="school-hero__established">Learning · Growing · Together</span>
        </section>

        <section className="school-stem" id="stem" aria-labelledby="stem-title">
          <div className="school-stem__heading">
            <div className="school-eyebrow school-eyebrow--blue">
              <span>02</span><span className="school-eyebrow__rule" /><span>Curiosity in action</span>
            </div>
            <h2 id="stem-title">STEM at<br /><span>Alene.</span></h2>
            <p>Ideas become discoveries when students have the space, tools, and support to explore.</p>
          </div>
          <figure className="school-stem__photo">
            <img
              src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1500&q=85"
              alt="Science laboratory glassware arranged for a practical experiment"
              loading="lazy"
            />
            <figcaption>Learning through experimentation</figcaption>
          </figure>
        </section>

        <section className="school-blue-band" aria-label="Our approach">
          <div className="school-blue-band__inner">
            <div>
              <p>Good questions lead somewhere.</p>
              <h2>Here, curiosity has room to grow.</h2>
            </div>
            <a href="#community" aria-label="Explore the Alene community">
              <ArrowRight size={21} />
            </a>
          </div>
        </section>

        <section className="school-community" id="community" aria-labelledby="community-title">
          <div className="school-community__mark" aria-hidden="true">03</div>
          <div className="school-community__copy">
            <div className="school-eyebrow">
              <span className="school-eyebrow__rule" /><span>Better, together</span>
            </div>
            <h2 id="community-title">A community<br />that shows up.</h2>
            <p>Students, families, and educators each bring something essential to the work of learning.</p>
            <a className="school-text-link" href="#portal-login">
              Meet your school community <ArrowRight size={15} />
            </a>
          </div>
          <div className="school-community__accent" aria-hidden="true" />
        </section>

        <section className="school-achievements" id="achievements" aria-labelledby="achievements-title">
          <div className="school-achievements__heading">
            <div className="school-eyebrow">
              <span>04</span><span className="school-eyebrow__rule" /><span>What we value</span>
            </div>
            <h2 id="achievements-title">Room to do<br />great things.</h2>
          </div>
          <div className="school-achievement-grid">
            <article>
              <span>01</span>
              <h3>Curious minds</h3>
              <p>Encouraging students to ask, test, and discover.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Shared effort</h3>
              <p>Building a stronger school through collaboration.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Every student</h3>
              <p>Making space for each learner to find their path.</p>
            </article>
          </div>
        </section>
      </main>

      <section className="school-portal" id="portal-login" aria-labelledby="portal-title">
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
            {selectedRole === 'STUDENT' && <span className="school-form-hint">Demo ID: student1</span>}

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

          <details className="school-demo-details">
            <summary>Use a demo account</summary>
            <p>Demo accounts are for testing only. Password: <strong>password123</strong></p>
            <div className="school-demo-buttons">
              <button type="button" onClick={() => setDemoCredentials('student1', 'STUDENT')}>Student</button>
              <button type="button" onClick={() => setDemoCredentials('parent1', 'PARENT')}>Parent</button>
              <button type="button" onClick={() => setDemoCredentials('teacher1', 'TEACHER')}>Teacher</button>
              <button type="button" onClick={() => setDemoCredentials('principal1', 'ADMIN_PRINCIPAL')}>Principal</button>
            </div>
          </details>
        </div>
      </section>

      <footer className="school-site-footer">
        <a className="school-site-brand" href="#home" aria-label="Back to top">
          <img src={schoolLogo} alt="" />
          <span>Alene High School</span>
        </a>
        <span>Learning together, every day.</span>
        <a href="#home">Back to top ↑</a>
      </footer>
    </div>
  );
};

export default Login;
