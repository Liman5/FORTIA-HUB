"use client";

import React, { useState } from 'react';
import { Certificate } from '../types';
import { generatePDFCertificate, triggerCelebrationConfetti } from '../utils/pdfGenerator';
import { INITIAL_CERTIFICATES_DATABASE } from '../data/academyData';
import { Award, Search, CheckCircle, ShieldCheck, Download, AlertCircle, Share2 } from 'lucide-react';

export const CertificateVerifier: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [foundCert, setFoundCert] = useState<Certificate | null>(
    INITIAL_CERTIFICATES_DATABASE && INITIAL_CERTIFICATES_DATABASE.length > 0 ? INITIAL_CERTIFICATES_DATABASE[0] : null
  );
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    const term = searchCode.trim().toUpperCase();
    const result = INITIAL_CERTIFICATES_DATABASE.find(
      c => c.id.toUpperCase() === term || c.studentName.toUpperCase().includes(term)
    );

    if (result) {
      setFoundCert(result);
      setErrorMsg('');
      triggerCelebrationConfetti();
    } else {
      setFoundCert(null);
      setErrorMsg(`Aucune attestation officielle trouvée pour le numéro ou nom : "${searchCode}". Veuillez vérifier le code tapé.`);
    }
  };

  return (
    <section className="py-12 bg-slate-50 min-h-[600px]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#AB6F10] uppercase tracking-wider bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            <Award className="w-4 h-4 text-[#D69E25]" />
            <span>Portail Public d'Authentification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#021231]">
            Vérificateur Officiel d'Attestations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Saisissez le numéro unique figurant sur l'attestation (ex: <strong>FORTIA-2026-CRYP-9482</strong>) pour contrôler l'authenticité et télécharger la copie conforme.
          </p>
        </div>

        {/* Search Bar Box */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-300 shadow-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Ex: FORTIA-2026-CRYP-9482 ou Nom de l'apprenant..."
              className="w-full bg-slate-50 text-xs font-semibold text-[#021231] placeholder-slate-400 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D69E25]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#021231] text-[#D69E25] font-black text-xs rounded-xl hover:bg-[#011D46] transition shadow"
          >
            Vérifier
          </button>
        </form>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Certificate Display Result */}
        {foundCert && (
          <div className="bg-white rounded-2xl border-2 border-[#D69E25] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Status Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Attestation Authentique & Certifiée conforme</span>
              </div>
              <span className="text-xs text-slate-400 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded">
                N° {foundCert.id}
              </span>
            </div>

            {/* Certificate Details Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              <div className="md:col-span-8 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Titulaire de l'Attestation</span>
                  <p className="text-xl font-black text-[#021231]">{foundCert.studentName}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formation validée</span>
                  <p className="text-sm font-bold text-[#011D46]">« {foundCert.courseTitle} »</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Discipline</span>
                    <span className="font-semibold text-slate-700">{foundCert.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Date d'émission</span>
                    <span className="font-semibold text-slate-700">{foundCert.issueDate}</span>
                  </div>
                </div>
              </div>

              {/* QR Code & Emblem */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <img
                  src={foundCert.qrCodeUrl}
                  alt="QR Code Vérification"
                  className="w-24 h-24 border-2 border-[#D69E25] p-1 bg-white rounded-lg shadow-sm"
                />
                <span className="text-[10px] text-slate-500 font-mono">Scanner pour vérifier</span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => generatePDFCertificate(foundCert)}
                className="px-5 py-3 bg-[#021231] text-[#D69E25] font-extrabold text-xs rounded-xl hover:bg-[#011D46] transition shadow flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la Copie PDF Officielle</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Lien de vérification copié dans le presse-papier !');
                }}
                className="px-4 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager le Lien</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
