import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useApp } from '@/context/AppContext';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { login, setIsLoading, isLoading } = useApp();

  const handleProviderClick = async (provider: 'google' | 'apple' | 'twitter' | 'facebook') => {
    setIsLoading(true);

    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock user data based on provider
      const mockUser = {
        id: `${provider}-${Date.now()}`,
        email: `user@${provider}.com`,
        displayName: 'Demo User',
        provider: provider as any,
        photoUrl: `https://ui-avatars.com/api/?name=Demo+User&background=random`,
      };

      login(mockUser);
      navigate('/mode');
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const providers: Array<{
    id: 'google' | 'apple' | 'twitter' | 'facebook';
    label: string;
  }> = [
    { id: 'google', label: 'Google' },
    { id: 'apple', label: 'Apple' },
    { id: 'twitter', label: 'X' },
    { id: 'facebook', label: 'Facebook' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header showUserMenu={false} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-lg flex flex-col items-center">
          {/* Title */}
          <h1 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-12 md:mb-16">
            Sign in with
          </h1>

          {/* Provider Links */}
          <div className="w-full flex flex-col items-center gap-6 md:gap-8">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderClick(provider.id)}
                disabled={isLoading}
                className="group relative flex items-center justify-center py-2 bg-transparent border-none cursor-pointer focus:outline-none transition-colors duration-200"
              >
                <span className="text-3xl md:text-4xl font-light tracking-tight text-foreground group-hover:text-primary transition-colors disabled:opacity-50">
                  {provider.label}
                </span>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mt-12 text-sm text-muted-foreground">
              Signing in...
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignIn;
