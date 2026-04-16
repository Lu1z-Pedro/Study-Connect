const STORAGE_KEY = "studyconnect-data";
const VIEWER_KEY = "studyconnect-viewer";
const SEED_SIGNATURE_KEY = "studyconnect-seed-signature";

function cloneSeedData() {
  return JSON.parse(JSON.stringify(STUDY_CONNECT_SEED));
}

function getSeedSignature() {
  return JSON.stringify(STUDY_CONNECT_SEED);
}

function mergeTopics(seedTopics, storedTopics) {
  const storedById = new Map((storedTopics || []).map((topic) => [topic.id, topic]));
  const mergedSeedTopics = seedTopics.map((seedTopic) => {
    const storedTopic = storedById.get(seedTopic.id);
    if (!storedTopic) return seedTopic;

    const storedExamplesById = new Map(
      (storedTopic.examples || []).map((example) => [example.id, example])
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

  const seedTopicIds = new Set(seedTopics.map((topic) => topic.id));
  const customTopics = (storedTopics || []).filter((topic) => !seedTopicIds.has(topic.id));

  return [...mergedSeedTopics, ...customTopics];
}

function syncStoredDataWithSeed(storedData) {
  const seedData = cloneSeedData();

  return {
    ...seedData,
    topics: mergeTopics(seedData.topics || [], storedData.topics || []),
  };
}

function readData() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const currentSeedSignature = getSeedSignature();
  const savedSeedSignature = window.localStorage.getItem(SEED_SIGNATURE_KEY);

  if (!raw) {
    const initialData = cloneSeedData();
    saveData(initialData);
    return initialData;
  }

  try {
    const parsedData = JSON.parse(raw);

    if (savedSeedSignature !== currentSeedSignature) {
      const syncedData = syncStoredDataWithSeed(parsedData);
      saveData(syncedData);
      return syncedData;
    }

    return parsedData;
  } catch (error) {
    const initialData = cloneSeedData();
    saveData(initialData);
    return initialData;
  }
}

function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.localStorage.setItem(SEED_SIGNATURE_KEY, getSeedSignature());
}

function getViewer() {
  const raw = window.localStorage.getItem(VIEWER_KEY);

  if (!raw) {
    return { role: "student", studentId: "student-1" };
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return { role: "student", studentId: "student-1" };
  }
}

function setViewer(viewer) {
  window.localStorage.setItem(VIEWER_KEY, JSON.stringify(viewer));
}
