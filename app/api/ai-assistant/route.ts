import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, type Content, type Tool } from "@google/genai";
import { AI_TOOL_DECLARATIONS, executeAiTool } from "@/lib/services/aiTools";
import { getCurrentUser } from "@/lib/services/authSession";
import { AppError } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Modèle Gemini utilisé par l'assistant IA.
 * Configurable via la variable d'environnement `GEMINI_MODEL` afin de pouvoir
 * changer de modèle sans modifier le code.
 *
 * Défaut : `gemini-3.7-flash` — modèle Flash le plus récent et capable,
 * disponible gratuitement dans le Free Tier de la Gemini API.
 *
 * Autres modèles Flash disponibles dans le Free Tier :
 * - gemini-3.6-flash
 * - gemini-3.5-flash
 * - gemini-3.5-flash-lite
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";

/**
 * Modèles de secours tentés automatiquement si le modèle principal (`GEMINI_MODEL`)
 * est temporairement indisponible (503 : forte affluence) ou en limite de quota
 * (429 : limite gratuite atteinte). Tous disponibles dans le Free Tier.
 * La liste par défaut peut être surchargée via `GEMINI_FALLBACK_MODELS`
 * (séparée par des virgules), sans modifier le code.
 */
const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS || "gemini-3.6-flash,gemini-3.5-flash"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/**
 * Client Gemini initialisé une seule fois au chargement du module.
 * La clé API est lue uniquement depuis `GEMINI_API_KEY` côté serveur :
 * elle n'est jamais transmise ni exposée au navigateur.
 */
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
    console.warn("Échec de l'initialisation du client Gemini:", err);
  }
}

const SYSTEM_INSTRUCTION = `Tu es l'assistant virtuel (IA) de la plateforme FORTIA HUB (https://fortia-hub.com).
RÈGLE OBLIGATOIRE ET STRICTE :
- Tu te présentes comme l'assistant virtuel (intelligence artificielle) de FORTIA HUB.
- Tu ne prétends JAMAIS être un humain, un conseiller humain ou un membre de l'équipe.
- Si l'utilisateur te demande si tu es une IA ou un humain, réponds honnêtement que tu es l'assistant virtuel (IA) de FORTIA HUB.
- Reste bienveillant et professionnel : cette transparence n'empêche pas de rendre un service de qualité.

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
- Propose et guide clairement l'utilisateur vers la bonne rubrique (Formations, Boutique, Prestations Agence, Vérification Certificat, Espace Membre).

STRUCTURE DE L'APPLICATION (pages et rubriques réelles) :
- Accueil / Formations : page « academy » (catalogue des formations certifiantes).
- Boutique & Produits : page « marketplace » (produits numériques et boutiques des vendeurs).
- Prestations Agence : page « services » (devis de prestations : logo, design, rédaction, montage vidéo...).
- Annuaire Freelance & Entreprises : pages « enterprises » et sections marketplace dédiées.
- Vérification de certificat : page « verifier » (vérification publique par numéro).
- Blog & Actualités : page « blog ».
- Mon Compte : page « member » (profil, achats, abonnements).
- Paramètres : page « settings » (modification du profil : nom, téléphone, mot de passe, avatar).
- Notifications : page « notifications ».
- Connexion / Inscription : modales de connexion et d'inscription (page « login » / « register »).

RÈGLES D'UTILISATION DES OUTILS (IMPORTANT) :
- Tu disposes d'outils pour consulter les données RÉELLES de la plateforme. La base de données est la SEULE source de vérité.
- Quand un utilisateur demande des informations existantes dans la plateforme (boutiques, produits, formations, freelances, entreprises, services, articles, paramètres, son profil, ses commandes, ses certificats, ses notifications, ses devis), appelle TOUJOURS l'outil correspondant avant de répondre. N'invente JAMAIS de boutique, produit, formation, prix, statistique ou donnée.
- Si un outil ne retourne aucun résultat ou renvoie une erreur, réponds honnêtement que l'information demandée n'est pas disponible, sans rien inventer.
- Pour les questions d'orientation (ex : « où puis-je modifier mon profil ? »), utilise la STRUCTURE DE L'APPLICATION ci-dessus.
- Tu ne peux PAS modifier, créer ou supprimer des données : tu guides uniquement l'utilisateur vers la rubrique de la plateforme concernée pour ces actions.
- Les données privées (profil, commandes, certificats, notifications, devis) ne concernent que le compte actuellement connecté. Si l'utilisateur n'est pas connecté ou si l'outil indique qu'il n'est pas authentifié, explique-lui qu'il doit d'abord se connecter, sans divulguer la moindre information.`;


/**
 * Extraire le code HTTP d'une erreur levée par le SDK `@google/genai`.
 * Le SDK lève une `ApiError` avec `status` (code HTTP) et un corps JSON dans
 * `error`. En cas d'échec de détection, on tente une correspondance par texte
 * (utile pour les réponses non JSON de certains proxies).
 */
function getGeminiErrorStatus(err: any): number {
  if (typeof err?.status === "number") return err.status;

  const bodyCode = err?.error?.error?.code ?? err?.error?.code;
  if (typeof bodyCode === "number") return bodyCode;

  const message = String(err?.message || "");
  // 429 = quota / limite de débit atteinte (fréquent sur le Free Tier).
  if (/RESOURCE_EXHAUSTED|rate limit|quota|429/i.test(message)) return 429;
  if (/permission|403|FORBIDDEN/i.test(message)) return 403;
  if (/api key|401|UNAUTHENTICATED|invalid/i.test(message)) return 401;

  return 500;
}

/**
 * Convertit une erreur de l'API Gemini en réponse HTTP lisible pour le client.
 * Attention particulière au code 429 : il correspond à la limite d'utilisation
 * gratuite atteinte (quota Free Tier de la Gemini API).
 */
function handleGeminiError(err: any): NextResponse {
  const status = getGeminiErrorStatus(err);
  const message = String(err?.message || "Erreur inconnue de l'API Gemini.");
  console.error(`[AI Assistant] Erreur Gemini (HTTP ${status}):`, message);

  if (status === 429) {
    return NextResponse.json(
      {
        error:
          "La limite d'utilisation gratuite de l'assistant IA a été atteinte pour le moment. Veuillez réessayer un peu plus tard.",
        code: "rate_limit_exceeded",
        isFallback: true,
      },
      { status: 429 }
    );
  }

  if (status === 401) {
    return NextResponse.json(
      {
        error:
          "La clé API Gemini est invalide ou expirée. Contactez l'administrateur de la plateforme.",
        code: "invalid_api_key",
        isFallback: true,
      },
      { status: 401 }
    );
  }

  if (status === 403) {
    return NextResponse.json(
      {
        error:
          "L'accès à l'assistant IA est actuellement refusé. Contactez l'administrateur de la plateforme.",
        code: "permission_denied",
        isFallback: true,
      },
      { status: 403 }
    );
  }

  if (status === 503) {
    return NextResponse.json(
      {
        error:
          "Le service d'assistance IA rencontre une forte affluence pour le moment. Veuillez réessayer dans quelques instants.",
        code: "temporarily_unavailable",
        isFallback: true,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Une erreur est survenue lors de la génération de la réponse par l'assistant IA. Réessayez plus tard.",
      code: "gemini_error",
      isFallback: true,
    },
    { status: 502 }
  );
}

/**
 * Tente de générer une réponse avec le modèle configuré (`GEMINI_MODEL`),
 * puis bascule automatiquement sur les modèles de secours gratuits si le
 * modèle principal est temporairement indisponible (503 : forte affluence)
 * ou en limite de quota (429 : limite gratuite atteinte).
 * Les erreurs définitives (401, 403, 404…) sont remontées immédiatement.
 */
async function generateWithFallback(
  contents: Content[],
  toolConfig?: { tools?: Tool[] }
): Promise<{ text: string; model: string; response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>> }> {
  const models = Array.from(new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]));
  let lastErr: any = null;

  for (const model of models) {
    try {
      const response = await aiClient!.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          ...(toolConfig?.tools ? { tools: toolConfig.tools } : {}),
        },
      });

      return {
        text: response.text || "Désolé, je n'ai pas pu générer de réponse pour le moment.",
        model,
        response,
      };
    } catch (err: any) {
      lastErr = err;
      const status = getGeminiErrorStatus(err);
      // Seuls les 503/429 (erreurs temporaires) déclenchent le basculement.
      if (status !== 503 && status !== 429) {
        throw err;
      }
      console.warn(
        `[AI Assistant] Modèle "${model}" indisponible (HTTP ${status}), bascule sur le modèle suivant.`
      );
    }
  }

  throw lastErr;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Le paramètre 'prompt' est requis." }, { status: 400 });
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    // Longueur maximale : protège le quota du fournisseur et la facture.
    const MAX_PROMPT_LENGTH = 2000;
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: `Votre message est trop long (${trimmedPrompt.length} caractères). Maximum ${MAX_PROMPT_LENGTH} caractères.`,
          code: "prompt_too_long",
        },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY || !aiClient) {
      return NextResponse.json(
        {
          error:
            "Le service d'assistance IA n'est pas configuré. Veuillez contacter l'administrateur de la plateforme.",
          code: "not_configured",
          isFallback: true,
        },
        { status: 503 }
      );
    }

    // === Identité de l'utilisateur connecté (JWT HttpOnly, résolu côté serveur) ===
    // Le cookie de session est la SEULE source d'identité : l'email éventuellement
    // envoyé par le client dans le body n'est JAMAIS utilisé pour les données privées.
    const sessionUser = await getCurrentUser(request).catch(() => null);

    // Limitation de débit : 10 requêtes / minute, par utilisateur ou par IP.
    try {
      await enforceRateLimit("aiAssistant", request, sessionUser?.id ?? null);
    } catch (limitError) {
      if (limitError instanceof AppError && limitError.status === 429) {
        return NextResponse.json(
          {
            error: "Trop de messages envoyés à l'assistant. Patientez une minute puis réessayez.",
            code: "rate_limited",
            isFallback: true,
          },
          { status: 429 }
        );
      }
      throw limitError;
    }

    try {
      // === Appel Gemini avec function calling ===
      const tools = [{ functionDeclarations: AI_TOOL_DECLARATIONS }];
      const contents: Content[] = [{ role: "user", parts: [{ text: trimmedPrompt }] }];

      let { text, model, response } = await generateWithFallback(contents, { tools });

      // Boucle d'exécution des outils demandés par Gemini (limitée).
      // Gemini appelle un outil → on l'exécute côté serveur contre Supabase →
      // on renvoie le résultat à Gemini → Gemini formule la réponse finale.
      const MAX_TOOL_ROUNDS = 4;
      let rounds = 0;
      while (response.functionCalls?.length && rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        const modelTurn = response.candidates?.[0]?.content;
        if (modelTurn) contents.push(modelTurn);

        const functionResponseParts = [];
        for (const fc of response.functionCalls) {
          const result = await executeAiTool(
            fc.name ?? "",
            (fc.args as Record<string, unknown>) ?? {},
            { user: sessionUser }
          );
          functionResponseParts.push({
            functionResponse: { name: fc.name, response: result },
          });
        }
        contents.push({ role: "user", parts: functionResponseParts });

        const next = await generateWithFallback(contents, { tools });
        text = next.text;
        response = next.response;
      }

      return NextResponse.json({
        text,
        isFallback: false,
        model,
        toolRounds: rounds,
      });
    } catch (geminiErr: any) {
      return handleGeminiError(geminiErr);
    }
  } catch (error: any) {
    console.error("Erreur générale AI Assistant:", error);
    return NextResponse.json(
      {
        error: "Une erreur est survenue lors du traitement par l'Assistant IA.",
        code: "internal",
        isFallback: true,
      },
      { status: 500 }
    );
  }
}