const STUDY_CONNECT_SEED = {
  subjects: ["Matematica", "Portugues", "Biologia", "Historia"],
  students: [
    { id: "student-1", name: "Luiz Pedro", grade: "2o B Administrativo" },
  ],
  teacher: {
    id: "teacher-1",
    name: "Prof. Carla Mendes",
    subject: "Ciencias",
  },
  topics: [
    {
      id: "topic-1",
      title: "Fracoes equivalentes",
      subject: "Matematica",
      studentId: "student-1",
      description:
        "Revise como identificar fracoes equivalentes e resolva os exemplos abaixo.",
      supportMaterial:
        "https://pt.khanacademy.org/math/arithmetic/fraction-arithmetic",
      createdAt: "2026-04-16T08:00:00.000Z",
      examples: [
        {
          id: "ex-1",
          text: "Simplifique a fracao 2/4.",
          doneByStudentIds: ["student-1"],
        },
        {
          id: "ex-2",
          text: "Encontre uma fracao equivalente para 3/5.",
          doneByStudentIds: [],
        },
      ],
    },
    {
      id: "topic-2",
      title: "Sistema respiratorio",
      subject: "Biologia",
      studentId: "student-2",
      description:
        "Leia o resumo e marque os exemplos conforme concluir os estudos.",
      supportMaterial:
        "https://brasilescola.uol.com.br/biologia/sistema-respiratorio.htm",
      createdAt: "2026-04-15T18:30:00.000Z",
      examples: [
        {
          id: "ex-3",
          text: "Explique a funcao dos alveolos.",
          doneByStudentIds: [],
        },
        {
          id: "ex-4",
          text: "Descreva o caminho do ar no corpo.",
          doneByStudentIds: [],
        },
      ],
    },
  ],
};
