// ─── Firebase Setup ───────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTppaicdoYQxG6uUNMSQtYRB243Degdok",
  authDomain: "study-connect-app.firebaseapp.com",
  projectId: "study-connect-app",
  storageBucket: "study-connect-app.firebasestorage.app",
  messagingSenderId: "503556713113",
  appId: "1:503556713113:web:4ec1750ef3530522862608",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Chaves ───────────────────────────────────────────────────────────────────
const DATA_DOC      = "studyconnect-data";
const VIEWER_DOC    = "studyconnect-viewer";
const SEED_SIG_DOC  = "studyconnect-seed-signature";
const COLLECTION    = "app";

// ─── Helpers internos ────────────────────────────────────────────────────────
function cloneSeedData() {
  return JSON.parse(JSON.stringify(STUDY_CONNECT_SEED));
}

function getSeedSignature() {
  return JSON.stringify(STUDY_CONNECT_SEED);
}

async function fsGet(key) {
  const snap = await getDoc(doc(db, COLLECTION, key));
  return snap.exists() ? snap.data().value : null;
}

async function fsSet(key, value) {
  await setDoc(doc(db, COLLECTION, key), { value });
}

// ─── Merge seed com dados salvos (mantém progresso do aluno) ─────────────────
function mergeTopics(seedTopics, storedTopics) {
  const storedById = new Map((storedTopics || []).map((t) => [t.id, t]));

  const mergedSeedTopics = seedTopics.map((seedTopic) => {
    const storedTopic = storedById.get(seedTopic.id);
    if (!storedTopic) return seedTopic;

    const storedExamplesById = new Map(
      (storedTopic.examples || []).map((e) => [e.id, e])
    );

    return {
      ...seedTopic,
      examples: (seedTopic.examples || []).map((seedExample) => {
        const storedExample = storedExamplesById.get(seedExample.id);
        if (!storedExample) return seedExample;
        return {
          ...seedExample,
          doneByStudentIds: Array.isArray(storedExample.doneByStudentIds)
            ? storedExample.doneByStudentIds
            : seedExample.doneByStudentIds || [],
        };
      }),
    };
  });

  const seedTopicIds = new Set(seedTopics.map((t) => t.id));
  const customTopics = (storedTopics || []).filter((t) => !seedTopicIds.has(t.id));

  return [...mergedSeedTopics, ...customTopics];
}

function syncStoredDataWithSeed(storedData) {
  const seedData = cloneSeedData();
  return {
    ...seedData,
    topics: mergeTopics(seedData.topics || [], storedData.topics || []),
  };
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Lê todos os dados do app.
 * Se for a primeira vez, salva o seed no Firestore.
 * Se o seed mudou, faz merge preservando o progresso do aluno.
 */
export async function readData() {
  const currentSeedSignature = getSeedSignature();

  const [raw, savedSeedSignature] = await Promise.all([
    fsGet(DATA_DOC),
    fsGet(SEED_SIG_DOC),
  ]);

  if (!raw) {
    const initialData = cloneSeedData();
    await saveData(initialData);
    return initialData;
  }

  try {
    const parsedData = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (savedSeedSignature !== currentSeedSignature) {
      const syncedData = syncStoredDataWithSeed(parsedData);
      await saveData(syncedData);
      return syncedData;
    }

    return parsedData;
  } catch {
    const initialData = cloneSeedData();
    await saveData(initialData);
    return initialData;
  }
}

/**
 * Salva todos os dados do app no Firestore.
 */
export async function saveData(data) {
  await Promise.all([
    fsSet(DATA_DOC, JSON.stringify(data)),
    fsSet(SEED_SIG_DOC, getSeedSignature()),
  ]);
}

/**
 * Retorna o viewer atual (role + studentId).
 * Usa localStorage apenas para o viewer — é intencional,
 * pois cada pessoa escolhe sua própria visão no dispositivo dela.
 */
export function getViewer() {
  const raw = window.localStorage.getItem("studyconnect-viewer");
  if (!raw) return { role: "student", studentId: "student-1" };
  try {
    return JSON.parse(raw);
  } catch {
    return { role: "student", studentId: "student-1" };
  }
}

/**
 * Salva o viewer atual no localStorage (local por dispositivo, intencional).
 */
export function setViewer(viewer) {
  window.localStorage.setItem("studyconnect-viewer", JSON.stringify(viewer));
}