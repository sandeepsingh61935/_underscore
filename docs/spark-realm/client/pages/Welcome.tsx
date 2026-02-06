import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useApp } from '@/context/AppContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  React.useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/mode');
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header onSignInClick={handleSignIn} />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl">
          {/* Icon */}
          <div className="mb-8 md:mb-12 flex justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-2xl flex items-center justify-center">
              <svg
                className="w-12 h-12 md:w-14 md:h-14 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 5h2a2 2 0 012 2v12a2 2 0 01-2 2h-2"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Simply organized.
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 leading-relaxed">
            Your browser extension for minimalist note-taking.
          </p>

          {/* Description */}
          <div className="mb-12 md:mb-16 space-y-4 text-muted-foreground">
            <p>
              Highlight what matters. Everything else fades away.
            </p>
            <p>
              Secure, encrypted, and designed for focus.
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="flex justify-center animate-bounce">
            <div className="text-4xl">↓</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 _underscore inc.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#help" className="hover:text-foreground transition-colors">
              Help
            </a>
            <a href="#terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
