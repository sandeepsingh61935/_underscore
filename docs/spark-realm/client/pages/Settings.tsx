import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header showUserMenu={false} />

      <main className="flex-1 px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground">
              Settings page coming soon. Continue prompting to fill in this page contents if you want it implemented.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
