import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useApp } from '@/context/AppContext';

interface ModeOption {
  id: 'walk' | 'sprint' | 'vault' | 'neural';
  label: string;
  requiresAuth: boolean;
}

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setMode } = useApp();

  const modes: ModeOption[] = [
    {
      id: 'walk',
      label: 'Focus',
      requiresAuth: false,
    },
    {
      id: 'sprint',
      label: 'Capture',
      requiresAuth: false,
    },
    {
      id: 'vault',
      label: 'Memory',
      requiresAuth: true,
    },
    {
      id: 'neural',
      label: 'Archive',
      requiresAuth: true,
    },
  ];

  const handleModeClick = (mode: 'walk' | 'sprint' | 'vault' | 'neural') => {
    if ((mode === 'vault' || mode === 'neural') && !isAuthenticated) {
      navigate('/sign-in');
      return;
    }
    setMode(mode);
    // Close popup/navigate as needed for extension
    if (mode === 'vault') {
      navigate('/collections');
    }
  };

  const freeModes = modes.filter(m => !m.requiresAuth);
  const premiumModes = modes.filter(m => m.requiresAuth);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-lg flex flex-col items-center">
          {/* Title */}
          <h1 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-12 md:mb-16">
            Mode
          </h1>

          {/* Modes Container */}
          <div className="w-full flex flex-col items-center gap-6 md:gap-8">
            {/* Free Modes */}
            {freeModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeClick(mode.id)}
                className="group relative flex items-center justify-center py-2 bg-transparent border-none cursor-pointer focus:outline-none transition-colors duration-200"
              >
                <span className="text-3xl md:text-4xl font-light tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {mode.label}
                </span>
              </button>
            ))}

            {/* Spacer */}
            <div className="h-4 w-full md:h-6"></div>

            {/* Premium Modes */}
            {premiumModes.map((mode) => (
              <div
                key={mode.id}
                className={`relative flex items-center justify-center py-2 ${
                  isAuthenticated ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
                onClick={() => isAuthenticated && handleModeClick(mode.id)}
                role={isAuthenticated ? 'button' : undefined}
              >
                <span className={`text-3xl md:text-4xl font-light tracking-tight text-foreground ${
                  isAuthenticated ? 'group-hover:text-primary transition-colors' : ''
                }`}>
                  {mode.label}
                </span>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          {!isAuthenticated && (
            <div className="mt-16 text-center">
              <button
                onClick={() => navigate('/sign-in')}
                className="group flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span>Sign in to unlock vault and archive</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ModeSelection;
