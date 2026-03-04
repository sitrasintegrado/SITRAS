import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const Login = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError('E-mail ou senha inválidos.');
      toast({ title: 'Erro ao entrar', description: authError.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden w-full"
      style={{ background: 'linear-gradient(135deg, hsl(210 60% 12%) 0%, hsl(210 50% 18%) 50%, hsl(152 40% 15%) 100%)' }}
    >
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(152 55% 50%) 0%, transparent 70%)' }}
      />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl backdrop-blur-sm shadow-2xl p-8 flex flex-col items-center border border-white/10"
        style={{ background: 'linear-gradient(145deg, hsla(0 0% 100% / 0.08), hsla(210 60% 12% / 0.6))' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-5 shadow-lg backdrop-blur-md border border-white/20">
          <img src={logo} alt="SITRAS Logo" className="h-10 w-10 object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">
          SITRAS Saúde
        </h1>
        <p className="text-sm text-white/50 mb-7 text-center">
          Sistema de Transporte da Saúde
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="E-mail"
              type="email"
              value={email}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Senha"
              type="password"
              value={password}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10 transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div className="text-sm text-red-400 text-left px-1">{error}</div>
            )}
          </div>

          <hr className="border-white/10" />

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold px-5 py-3 rounded-full shadow-lg transition text-sm text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(210 70% 40%), hsl(152 55% 40%))' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Footer text */}
      <div className="relative z-10 mt-10 flex flex-col items-center text-center">
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} SITRAS — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default Login;
