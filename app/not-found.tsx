import Link from "next/link";

export const metadata = {
  title: "Page Non Trouvée | FORTIA HUB",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#021231] text-white">
      <div className="text-center space-y-6 p-8">
        <div className="text-6xl font-black text-[#D69E25]">404</div>
        <h1 className="text-2xl font-bold">Page Non Trouvée</h1>
        <p className="text-slate-400 max-w-md text-sm">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-sm hover:bg-amber-400 transition"
        >
          Retour à l'Accueil
        </Link>
      </div>
    </div>
  );
}