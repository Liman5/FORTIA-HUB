import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FORTIA HUB ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-lg w-full bg-[#011D46] border-2 border-[#D69E25]/50 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden gpu-layer">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D69E25]/20 text-[#D69E25] border border-[#D69E25]/40 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protection & Stabilité Fortia</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                {this.props.fallbackTitle || 'Une interruption temporaire est survenue'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto font-medium">
                Un problème mineur d'affichage s'est produit. Pas d'inquiétude : vos données et vos accès restent parfaitement sécurisés.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#021231] p-3 rounded-xl border border-slate-700/80 text-left text-[11px] font-mono text-slate-400 overflow-x-auto max-h-24">
                <p className="text-amber-400 font-bold mb-1">Détails techniques :</p>
                <p>{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réactualiser le composant</span>
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 border border-[#D69E25]/60 text-[#D69E25] font-black rounded-xl text-xs hover:bg-[#D69E25]/10 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Recharger l'Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
