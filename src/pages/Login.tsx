import React from 'react';
import { LogIn } from 'lucide-react';
import { useFirebase } from '../components/FirebaseProvider';
import { Card } from '../components/ui/Card';

export default function Login() {
  const { login } = useFirebase();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tighter">FERMATA</h1>
          <p className="text-xs text-text-secondary uppercase tracking-[0.4em] mt-2">Management System</p>
        </div>

        <Card className="p-8 border-accent/20">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">SYSTEM ACCESS</h2>
            <p className="text-[10px] text-text-secondary mt-2 uppercase tracking-widest">AUTHORIZED PERSONNEL ONLY</p>
          </div>

          <button 
            onClick={login}
            className="w-full fermata-button-primary flex items-center justify-center gap-3 py-4"
          >
            <LogIn size={20} />
            <span>SIGN IN WITH GOOGLE</span>
          </button>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] leading-relaxed">
              BY ACCESSING THIS SYSTEM, YOU AGREE TO THE FERMATA DATA PRIVACY POLICY AND SECURITY PROTOCOLS.
            </p>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-[8px] text-text-muted uppercase tracking-widest font-bold">FERMATA_CORE_V1.0 · SECURE_LINK_ACTIVE</p>
        </div>
      </div>
    </div>
  );
}
