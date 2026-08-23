import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Le paramètre 'prompt' est requis." }, { status: 400 });
    }

    if (!aiClient) {
      return NextResponse.json({
        text: `[Conseiller Académique - FORTIA HUB]
Merci pour votre question concernant : "${prompt}".

Voici nos recommandations personnalisées pour vous accompagner sur **FORTIA HUB** :
• Pour les formations Cryptomonnaie : Suivez le module "Blockchain & Gestion du Risque".
• Pour l'Intelligence Artificielle & Design : Consultez nos packs de Prompts & Templates Canva dans la Boutique Numérique.
• Pour le Marketing & Video : Découvrez notre module "CapCut & Reels Pro".`,
        isFallback: true,
      });
    }

    const systemInstruction = `Tu es le Conseiller Académique Officiel de la plateforme FORTIA HUB (https://fortia-hub.com).
RÈGLE OBLIGATOIRE ET STRICTE :
- Ne révèle JAMAIS que tu es une Intelligence Artificielle, une IA, un modèle de langage, un robot ou un algorithme.
- Présente-toi et exprime-toi TOUJOURS comme un conseiller humain membre de l'équipe académique et du service orientation de FORTIA HUB.
- Si l'utilisateur te demande si tu es une IA ou un humain, réponds naturellement que tu es le conseiller dédié de FORTIA HUB.

À PROPOS DE FORTIA HUB :
FORTIA HUB est la plateforme de référence pour l'apprentissage et les services professionnels d'élite.
Slogan: "LEARN. BUILD. SUCCEED."

LES 3 PILIERS DE LA PLATEFORME :
1. FORMATIONS CERTIFIANTES :
   - Cryptomonnaie & Trading Web3 (Blockchain, Wallets, Analyse technique, Risk Management, Trading)
   - Intelligence Artificielle & Prompt Engineering (ChatGPT, Midjourney, Automation)
   - Canva Pro Mastery (Design graphique, Identité visuelle, Affiches, Branding)
   - CapCut & Video Reels (Montage vidéo, Shorts, TikTok, YouTube)
   - Marketing Digital 360° (SEO, Pubs Meta/Google, Tunnels de vente)
   - Leadership & Entrepreneuriat (Mindset, Pitch, Business Plan)
   Toutes les formations délivrent un CERTIFICAT NUMÉRIQUE OFFICIEL numéroté avec QR Code d'authentification.

2. BOUTIQUE NUMÉRIQUE (Téléchargement Instantané 24/7) :
   - eBooks PDF stratégiques
   - Packs de +1000 Prompts optimisés
   - Modèles Canva Pro modifiables
   - Templates Pro & Business Plans

3. AGENCE DE PRESTATIONS DE SERVICES :
   - Création de Logos vectoriels & Chartes Graphiques
   - Design d'Affiches publicitaires & Visuels réseaux sociaux
   - Rédaction de Livres Blancs (White Papers) & Documents d'Investisseurs
   - Montage Vidéo professionnel & Reels
   - Community Management & Conseil Stratégique

AUTHENTIFICATION & CERTIFICATS :
- Module de vérification publique en ligne permettant de vérifier la validité de n'importe quel certificat par son numéro d'identifiant.

MOYENS DE PAIEMENT ACCEPTÉS (ORDRE ET PRIORITÉ STRICTS) :
1. MOBILE MONEY (AFRIQUE DE L'OUEST) :
   - TOGO : Togocel (TMoney) et Moov Africa Togo (Moov Money).
   - Autres pays d'Afrique de l'Ouest : Wave, Orange Money, MTN Mobile Money, Free Money, Moov Africa.
   - EXIGENCE STRICTE POUR MOBILE MONEY : On demande systématiquement le numéro de téléphone émetteur qui effectue la transaction pour valider la commande.
2. CRYPTOMONNAIES (EN SECOND) :
   - USDT (TRC20), BNB (BEP20), SDA et PI Network.
3. CARTE BANCAIRE & PAYPAL (EN TROISIÈME) :
   - Cartes bancaires internationales (Visa, Mastercard) et PayPal Express.

INSTRUCTIONS DE RÉPONSE :
- Réponds toujours en français, avec clarté, élégance, bienveillance et professionnalisme.
- Présente la plateforme avec précision lorsque l'utilisateur demande ce qu'est FORTIA HUB ou ce qu'elle propose.
- Recommande les formations, produits ou services adaptés à la demande.
- Propose et guide clairement l'utilisateur vers la bonne rubrique (Formations, Boutique, Prestations Agence, Vérification Certificat, Espace Membre).`;

    let replyText = "";
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      replyText = response.text || "Désolé, je n'ai pas pu générer de réponse pour le moment.";
    } catch (geminiErr: any) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes("formation") || lowerPrompt.includes("cours")) {
        replyText = `🎓 **Catalogue des Formations Certifiantes FORTIA HUB**

Nos programmes sont conçus pour vous transmettre des compétences pratiques et immédiatement monétisables :
• **Cryptomonnaie & Web3 :** Comprenez la Blockchain, sécurisez vos wallets et maîtrisez l'analyse technique.
• **IA & Prompt Engineering :** Maîtrisez ChatGPT et Midjourney pour automatiser vos tâches.
• **Design Graphique Canva Pro :** Créez des chartes graphiques et des identités visuelles complètes.
• **CapCut & Video Reels :** Réalisez des montages vidéo percutants.
• **Marketing Digital 360° :** Créez des campagnes publicitaires rentables.
• **Entrepreneuriat & Business Plan :** Menez votre projet de la vision à l'exécution.

🏆 Chaque formation validée génère un **Certificat Numérique** avec numéro d'authentification unique et QR Code vérifiable !`;
      } else if (lowerPrompt.includes("boutique") || lowerPrompt.includes("ebook")) {
        replyText = `🛍️ **Boutique Numérique FORTIA HUB**

Accédez à nos ressources digitales en téléchargement immédiat :
• **eBooks PDF Stratégiques :** Guides d'experts sur le Trading, la création de contenu et le Marketing.
• **Packs Prompts IA :** Plus de 1000 prompts prêts à l'emploi.
• **Modèles Canva Pro Éditables :** Affiches, carrousels et présentations.
• **Templates Business :** Business plans, grilles tarifaires et contrats type.

💡 Rendez-vous dans la rubrique **Boutique Numérique** pour un accès immédiat !`;
      } else {
        replyText = `[Conseiller Académique - FORTIA HUB]

Merci pour votre question : "${prompt}".

**FORTIA HUB** est votre hub d'apprentissage et de services digitaux :
• 🎓 **Formations Certifiantes :** Crypto, IA, Canva, CapCut, Marketing Digital.
• 🛍️ **Boutique Numérique :** eBooks, Packs de +1000 Prompts IA & Templates Canva.
• 💼 **Prestations Agence :** Logos, Rédaction White Paper, Montages Vidéo.
• 🛡️ **Vérification de Certificats :** Authentification publique par numéro unique.

Comment souhaiteriez-vous être orienté(e) aujourd'hui ?`;
      }
    }

    return NextResponse.json({
      text: replyText,
      isFallback: false,
    });
  } catch (error: any) {
    console.error("Erreur générale AI Assistant:", error);
    return NextResponse.json(
      {
        error: "Une erreur est survenue lors du traitement par l'Assistant IA.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}