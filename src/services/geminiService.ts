import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string
const MODEL = "gemini-3.1-flash-lite"

function getModel() {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: MODEL }, { apiVersion: "v1" })
}

/**
 * Generates a short child-friendly explanation of why an answer is correct.
 * Returns empty string if unavailable.
 */
export async function generateExplanation(
  question: string,
  correctAnswer: string,
): Promise<string> {
  if (!apiKey) return ""
  try {
    const model = getModel()
    const prompt = `Je bent een enthousiaste leerkracht voor basisschoolkinderen (10-12 jaar).
Geef een korte, eenvoudige uitleg (maximaal 3 zinnen) waarom het antwoord op deze vraag klopt.
Gebruik eenvoudige taal, geen moeilijke woorden. Zorg dat alle informatie klopt en de taal correct is.

Vraag: ${question}
Correct antwoord: ${correctAnswer}

Geef enkel de uitleg, geen inleiding of afsluiting.`
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch {
    return ""
  }
}

/**
 * Evaluates a student's open answer against a reference answer.
 * Falls back to simple string comparison if the API fails.
 */
export async function evaluateAnswer(
  question: string,
  referenceAnswer: string,
  studentAnswer: string,
): Promise<boolean> {
  if (!apiKey) {
    const ref = referenceAnswer.toLowerCase().trim()
    const ans = studentAnswer.toLowerCase().trim()
    return ans === ref || ans.includes(ref) || ref.includes(ans)
  }
  try {
    const model = getModel()
    const prompt = `Je bent een onderwijsassistent voor basisschoolkinderen (6-12 jaar).
Beoordeel of het antwoord van de leerling correct is ten opzichte van het juiste antwoord.
Kleine spelfouten, synoniemen of andere formuleringen met dezelfde betekenis zijn ook CORRECT.

Vraag: ${question}
Correct antwoord: ${referenceAnswer}
Antwoord van de leerling: ${studentAnswer}

Antwoord enkel met één woord: CORRECT of FOUT.`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim().toUpperCase()
    return text.startsWith("CORRECT")
  } catch {
    const ref = referenceAnswer.toLowerCase().trim()
    const ans = studentAnswer.toLowerCase().trim()
    return ans === ref || ans.includes(ref) || ref.includes(ans)
  }
}
