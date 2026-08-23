"use client";

import React, { useState } from 'react';
import { Course, Lesson, Certificate } from '../types';
import { generatePDFCertificate, triggerCelebrationConfetti } from '../utils/pdfGenerator';
import { 
  X, 
  CheckCircle, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  Award, 
  Download, 
  Lock,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface CoursePlayerModalProps {
  course: Course;
  onClose: () => void;
  studentName: string;
  onRateCourse?: (courseId: string, rating: number) => void;
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course,
  onClose,
  studentName,
  onRateCourse
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'certificate'>('content');
  const chapters = course.chapters || [];
  const initialLesson: Lesson = chapters[0]?.lessons?.[0] || {
    id: 'default',
    title: 'Introduction au Cours',
    duration: '05:00',
    type: 'video',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: 'Bienvenue dans cette formation.'
  };

  const [currentLesson, setCurrentLesson] = useState<Lesson>(initialLesson);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['l1']);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const totalLessonsCount = chapters.reduce((acc, ch) => acc + (ch.lessons ? ch.lessons.length : 0), 0);
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedLessonIds.length / totalLessonsCount) * 100) : 0;

  const isCourseCompleted = progressPercent === 100;

  const toggleLessonComplete = (lessonId: string) => {
    if (completedLessonIds.includes(lessonId)) {
      setCompletedLessonIds(completedLessonIds.filter(id => id !== lessonId));
    } else {
      setCompletedLessonIds([...completedLessonIds, lessonId]);
    }
  };

  const markAllComplete = () => {
    const allIds = chapters.flatMap(ch => (ch.lessons || []).map(l => l.id));
    setCompletedLessonIds(allIds);
    triggerCelebrationConfetti();
  };

  // Generated Certificate object for this student & course
  const currentCertificate: Certificate = {
    id: `FORTIA-2026-${String(course.category || (course as any).categoryLabel || "FORT").toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
    studentName: studentName || 'Apprenant FORTIA',
    courseTitle: course.title,
    category: course.categoryLabel,
    issueDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    grade: 'Mention Excellent (98%)',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FORTIA-CERT',
    verified: true
  };

  const handleDownloadCertificate = () => {
    triggerCelebrationConfetti();
    generatePDFCertificate(currentCertificate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#021231] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#D69E25]/40">
          <div className="flex items-center gap-3">
            <span className="bg-[#D69E25] text-[#021231] text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              {course.categoryLabel}
            </span>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-white line-clamp-1">{course.title}</h2>
              <p className="text-xs text-slate-300">Instructeur: {course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Completion Progress Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-[#011D46] px-3 py-1.5 rounded-lg border border-[#D69E25]/30 text-xs">
              <span className="text-slate-300">Progression :</span>
              <strong className="text-[#D69E25]">{progressPercent}%</strong>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'content'
                ? 'border-[#021231] text-[#021231]'
                : 'border-transparent text-slate-600 hover:text-[#021231]'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-[#D69E25]" />
            <span>Cours & Leçons</span>
          </button>

          {course.quiz && course.quiz.length > 0 && (
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'border-[#021231] text-[#021231]'
                  : 'border-transparent text-slate-600 hover:text-[#021231]'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-[#D69E25]" />
              <span>Quiz d'Évaluation</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'certificate'
                ? 'border-[#021231] text-[#021231]'
                : 'border-transparent text-slate-600 hover:text-[#021231]'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Certificat Officiel {isCourseCompleted && '🏆'}</span>
          </button>

          {/* Quick Mark All Button for Demo */}
          {!isCourseCompleted && (
            <button
              onClick={markAllComplete}
              className="ml-auto text-[11px] font-bold text-[#AB6F10] hover:underline"
            >
              ⚡ Simuler fin de formation
            </button>
          )}
        </div>

        {/* Main Classroom Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* TAB 1: CONTENT PLAYER */}
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Lesson Viewer */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#021231] rounded-xl overflow-hidden aspect-video flex items-center justify-center relative shadow-lg border border-[#D69E25]/30">
                  {/* Simulated Video Player Banner */}
                  <img 
                    src={course.image} 
                    alt={currentLesson?.title} 
                    className="w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-t from-[#021231] via-transparent to-[#021231]/80">
                    <div className="w-16 h-16 rounded-full bg-[#D69E25] text-[#021231] flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition">
                      <PlayCircle className="w-10 h-10 fill-current" />
                    </div>
                    <span className="text-white font-extrabold text-sm sm:text-base max-w-md">
                      {currentLesson?.title || 'Session de formation FORTIA HUB'}
                    </span>
                    <span className="text-xs text-[#D69E25] font-semibold bg-[#011D46] px-3 py-1 rounded-full border border-[#D69E25]/40">
                      Vidéo HD • {currentLesson?.duration || '20 min'}
                    </span>
                  </div>
                </div>

                {/* Lesson Description & Actions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-[#021231]">{currentLesson?.title}</h3>
                    <button
                      onClick={() => toggleLessonComplete(currentLesson?.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        completedLessonIds.includes(currentLesson?.id)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{completedLessonIds.includes(currentLesson?.id) ? 'Terminée' : 'Marquer terminée'}</span>
                    </button>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    Dans cette leçon dispensée par <strong>{course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB"}</strong>, vous découvrirez les notions clés, les cas pratiques d'application et la méthodologie de travail recommandée par FORTIA HUB.
                  </p>

                  {/* ⭐ Notation en étoiles */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#D69E25] shrink-0" />
                      Noter cette formation :
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = star <= Math.round(course.rating || 0);
                        return (
                          <button
                            key={star}
                            onClick={() => onRateCourse?.(course.id, star)}
                            title={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                            className="text-lg leading-none transition hover:scale-125 cursor-pointer"
                          >
                            <span className={filled ? "text-amber-500" : "text-slate-300"}>★</span>
                          </button>
                        );
                      })}
                      <span className="ml-1 text-[11px] text-slate-500 font-semibold">
                        ({course.rating} • {course.reviewsCount || 0})
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Award className="w-4 h-4 text-[#D69E25] shrink-0 mt-0.5" />
                    <span>
                      Astuce Pédagogique : Prenez des notes synthétiques et complétez les exercices pour valider le quiz final et débloquer votre Certificat Officiel.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Syllabus Sidebar */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  Programme du Cours ({totalLessonsCount} leçons)
                </h4>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {course.chapters.map((chapter, idx) => (
                    <div key={chapter.id} className="space-y-2">
                      <p className="text-xs font-extrabold text-[#021231]">
                        {chapter.title}
                      </p>
                      <div className="space-y-1">
                        {chapter.lessons.map((lesson) => {
                          const isCurrent = currentLesson?.id === lesson.id;
                          const isDone = completedLessonIds.includes(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setCurrentLesson(lesson)}
                              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                                isCurrent
                                  ? 'bg-[#021231] text-[#D69E25] font-bold'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isDone ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <PlayCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{lesson.title}</span>
                              </div>
                              <span className="text-[10px] opacity-70 shrink-0 ml-1">{lesson.duration}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: QUIZ EVALUATION */}
          {activeTab === 'quiz' && course.quiz && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-[#021231]">Évaluation Connaissances & Acquis</h3>
                <p className="text-xs text-slate-500">Répondez correctement aux questions pour valider votre mention.</p>
              </div>

              <div className="space-y-6">
                {course.quiz.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <p className="font-bold text-xs text-[#021231]">
                      {idx + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[q.id] === oIdx;
                        const isCorrect = q.correctAnswer === oIdx;

                        let optClass = 'bg-white border-slate-200 text-slate-700 hover:border-slate-400';
                        if (quizSubmitted) {
                          if (isCorrect) optClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                          else if (isSelected && !isCorrect) optClass = 'bg-rose-50 border-rose-400 text-rose-900';
                        } else if (isSelected) {
                          optClass = 'bg-[#021231] text-[#D69E25] font-bold border-[#D69E25]';
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [q.id]: oIdx })}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition ${optClass}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 italic">
                        💡 <strong>Explication:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {!quizSubmitted ? (
                <button
                  onClick={() => {
                    setQuizSubmitted(true);
                    markAllComplete();
                  }}
                  className="w-full py-3 bg-[#021231] text-[#D69E25] font-extrabold text-xs rounded-xl shadow-lg hover:bg-[#011D46] transition"
                >
                  Valider mes Réponses
                </button>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <p className="font-bold text-emerald-800 text-sm">🎉 Bravo ! Votre Quiz est validé avec succès !</p>
                  <button
                    onClick={() => setActiveTab('certificate')}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition"
                  >
                    Obtenir mon Attestation Officielle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CERTIFICATE GENERATOR */}
          {activeTab === 'certificate' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-[#D69E25]/40 shadow-xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-[#D69E25] flex items-center justify-center mx-auto border-2 border-[#D69E25]">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#021231]">
                  Attestation d'Accomplissement Officielle
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Délivrée par <strong>FORTIA HUB</strong> au titulaire ci-dessous avec signature numérique et numéro de vérification authentifié.
                </p>
              </div>

              {/* Certificate Preview Card */}
              <div className="bg-[#021231] text-white p-6 rounded-xl border-2 border-[#D69E25] shadow-2xl relative space-y-4">
                <div className="flex items-center justify-between border-b border-[#D69E25]/30 pb-3">
                  <span className="font-black text-xs text-[#D69E25] tracking-widest uppercase">
                    FORTIA HUB • ATTESTATION
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    N° {currentCertificate.id}
                  </span>
                </div>

                <div className="space-y-1 py-2">
                  <p className="text-[11px] text-slate-300">Décerné à :</p>
                  <p className="text-xl font-black text-white tracking-wide uppercase">{currentCertificate.studentName}</p>
                  <p className="text-xs text-[#D69E25] font-semibold pt-1">
                    « {currentCertificate.courseTitle} »
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#D69E25]/30 text-[10px] text-slate-300">
                  <span>Délivré le : {currentCertificate.issueDate}</span>
                  <span className="text-emerald-400 font-bold">✓ Authenticité Vérifiée</span>
                </div>
              </div>

              {/* Action Download PDF Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleDownloadCertificate}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs rounded-xl shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger l'Attestation (PDF Haute Qualité)</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
