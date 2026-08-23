import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { Certificate } from '../types';

export function triggerCelebrationConfetti() {
  try {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#D69E25', '#AB6F10', '#021231', '#011D46', '#FFFFFF']
    });
  } catch (err) {
    console.log('Confetti error:', err);
  }
}

export function generatePDFCertificate(cert: Certificate) {
  // Create landscape PDF certificate (A4 size: 297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = 297;
  const height = 210;

  // Background - Soft luxury cream off-white
  doc.setFillColor(253, 253, 253);
  doc.rect(0, 0, width, height, 'F');

  // Deep Navy Outer Border (#021231)
  doc.setDrawColor(2, 18, 49);
  doc.setLineWidth(4);
  doc.rect(10, 10, width - 20, height - 20, 'S');

  // Inner Gold Border (#D69E25)
  doc.setDrawColor(214, 158, 37);
  doc.setLineWidth(1.5);
  doc.rect(14, 14, width - 28, height - 28, 'S');

  // Decorative Corner Gold Accents
  const cornerSize = 12;
  // Top-Left
  doc.line(10, 10 + cornerSize, 10 + cornerSize, 10);
  // Top-Right
  doc.line(width - 10 - cornerSize, 10, width - 10, 10 + cornerSize);
  // Bottom-Left
  doc.line(10, height - 10 - cornerSize, 10 + cornerSize, height - 10);
  // Bottom-Right
  doc.line(width - 10 - cornerSize, height - 10, width - 10, height - 10 - cornerSize);

  // Header Title - FORTIA HUB
  doc.setTextColor(2, 18, 49); // #021231 Navy
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('FORTIA HUB', width / 2, 35, { align: 'center' });

  // Slogan - LEARN. BUILD. SUCCEED.
  doc.setTextColor(171, 111, 16); // Gold Dark #AB6F10
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LEARN. BUILD. SUCCEED.', width / 2, 42, { align: 'center' });

  // Main Certificate Title
  doc.setTextColor(214, 158, 37); // Light Gold #D69E25
  doc.setFont('times', 'bold');
  doc.setFontSize(32);
  doc.text('ATTESTATION D\'ACCOMPLISSEMENT', width / 2, 62, { align: 'center' });

  // Subtitle
  doc.setTextColor(80, 90, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Cette présente attestation est décernée à :', width / 2, 75, { align: 'center' });

  // Student Name
  doc.setTextColor(2, 18, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(cert.studentName.toUpperCase(), width / 2, 92, { align: 'center' });

  // Line under student name
  doc.setDrawColor(214, 158, 37);
  doc.setLineWidth(1);
  doc.line(width / 2 - 70, 96, width / 2 + 70, 96);

  // Body Text
  doc.setTextColor(60, 70, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    `Pour avoir suivi avec succès et validé l'ensemble du programme de formation professionnelle :`,
    width / 2,
    108,
    { align: 'center' }
  );

  // Course Title
  doc.setTextColor(1, 29, 70); // #011D46
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`« ${cert.courseTitle} »`, width / 2, 122, { align: 'center' });

  // Category & Grade
  doc.setTextColor(171, 111, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Spécialité : ${cert.category}  |  ${cert.grade}`, width / 2, 134, { align: 'center' });

  // Footer Section - Date, Signature & Verification
  // Left: Date & Certificate ID
  doc.setTextColor(100, 110, 125);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date de délivrance : ${cert.issueDate}`, 35, 165);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 18, 49);
  doc.text(`N° Unique de Vérification :`, 35, 173);
  doc.setTextColor(171, 111, 16);
  doc.text(cert.id, 35, 180);

  // Center: Gold Emblem / Seal representation
  doc.setFillColor(214, 158, 37);
  doc.circle(width / 2, 168, 12, 'F');
  doc.setFillColor(2, 18, 49);
  doc.circle(width / 2, 168, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIEL', width / 2, 167, { align: 'center' });
  doc.text('EXCELLENCE', width / 2, 171, { align: 'center' });

  // Right: Direction Signature
  doc.setTextColor(2, 18, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Ibrahima Cham', width - 75, 165);
  doc.setTextColor(100, 110, 125);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fondateur & Directeur de FORTIA HUB', width - 75, 171);

  // Simulated Cursive Signature Line
  doc.setDrawColor(2, 18, 49);
  doc.setLineWidth(0.8);
  doc.line(width - 80, 178, width - 30, 178);

  // Save the PDF file
  const fileName = `Attestation_FORTIA_${cert.id}.pdf`;
  doc.save(fileName);
}

export function downloadProductDeliverable(title: string, format = 'PDF / ZIP', downloadUrl?: string) {
  // If a custom URL exists and is valid external link, open it
  if (downloadUrl && downloadUrl !== '#' && (downloadUrl.startsWith('http') || downloadUrl.startsWith('data:'))) {
    window.open(downloadUrl, '_blank');
  }

  // Generate official FORTIA HUB Digital Deliverable Document PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = 210;
  const height = 297;

  // Background
  doc.setFillColor(2, 18, 49); // Deep Navy #021231
  doc.rect(0, 0, width, 45, 'F');

  // Header Logo / Brand
  doc.setTextColor(214, 158, 37); // Gold #D69E25
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FORTIA HUB - LIVRABLE OFFICIEL', 15, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Achat Numérique Garanti & Sécurisé • Accès Instantané 24/7', 15, 33);

  // Main Card Box
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 55, width - 30, 220, 'F');
  doc.setDrawColor(214, 158, 37);
  doc.setLineWidth(0.8);
  doc.rect(15, 55, width - 30, 220, 'S');

  // Product Title Header
  doc.setTextColor(2, 18, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VOTRE RESSOURCE NUMÉRIQUE :', 25, 75);

  doc.setTextColor(214, 158, 37);
  doc.setFontSize(18);
  const splitTitle = doc.splitTextToSize(title, width - 60);
  doc.text(splitTitle, 25, 87);

  let currentY = 87 + (splitTitle.length * 8) + 10;

  // Format Info
  doc.setFillColor(245, 247, 250);
  doc.rect(25, currentY, width - 50, 25, 'F');
  doc.setDrawColor(220, 225, 230);
  doc.rect(25, currentY, width - 50, 25, 'S');

  doc.setTextColor(2, 18, 49);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Format Inclus : ${format}`, 32, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 110, 125);
  doc.text('Statut : Téléchargement débloqué - Licence d\'utilisation personnelle', 32, currentY + 18);

  currentY += 38;

  // Instructions Box
  doc.setTextColor(2, 18, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INSTRUCTIONS & INCLUSIONS :', 25, currentY);

  currentY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 60, 75);

  const instructions = [
    '1. Ce document atteste de la propriété de votre achat sur la Marketplace FORTIA HUB.',
    '2. Tous les fichiers originaux, modèles Canva/PDF, vidéos HD et promps IA sont synchronisés.',
    '3. Vous bénéficiez des mises à jour gratuites à vie sur cette ressource.',
    '4. Un support technique dédié 24/7 est disponible depuis votre Espace Membre.',
    '5. Conservez précieusement ce fichier comme justificatif de licence officielle.'
  ];

  instructions.forEach((inst) => {
    doc.text(inst, 25, currentY);
    currentY += 8;
  });

  currentY += 15;

  // Golden Access Button representation in PDF
  doc.setFillColor(214, 158, 37);
  doc.rect(25, currentY, width - 50, 18, 'F');
  doc.setTextColor(2, 18, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LIEN D\'ACCÈS DIRECT AUX FICHIERS ET FORMATION', width / 2, currentY + 11, { align: 'center' });

  currentY += 30;

  // Footer / Verification
  doc.setDrawColor(214, 158, 37);
  doc.setLineWidth(0.5);
  doc.line(25, currentY, width - 25, currentY);

  currentY += 10;
  doc.setTextColor(120, 130, 145);
  doc.setFontSize(9);
  doc.text(`FORTIA HUB Marketplace • Réf: LVR-${Date.now().toString().slice(-8)} • Document Officiel Authentifié`, width / 2, currentY, { align: 'center' });

  const cleanFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Livrable_FORTIA.pdf`;
  doc.save(cleanFileName);
}

