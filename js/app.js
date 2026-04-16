function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(value) {
  const url = String(value).trim();
  if (!url) return false;

  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function ensureTeacherAccess() {
  const viewer = getViewer();
  if (viewer.role !== "teacher") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function getStudentById(data, studentId) {
  return data.students.find((student) => student.id === studentId) || null;
}

function getTeacherById(data, teacherId) {
  return (data.teachers || []).find((teacher) => teacher.id === teacherId) || null;
}

function getTopicById(data, topicId) {
  return data.topics.find((topic) => topic.id === topicId) || null;
}

function setStudentViewer(studentId) {
  setViewer({ role: "student", studentId });
}

function setTeacherViewer(teacherId) {
  setViewer({ role: "teacher", teacherId });
}

function buildTopicProgress(topic, studentId) {
  const total = topic.examples.length;
  const completed = topic.examples.filter((example) =>
    example.doneByStudentIds.includes(studentId)
  ).length;

  return { total, completed };
}

function getSubjects(data) {
  if (Array.isArray(data.subjects) && data.subjects.length) {
    return data.subjects;
  }

  return [...new Set(data.topics.map((topic) => topic.subject))];
}

function renderIndexPage() {
  const data = readData();
  const studentOptions = data.students
    .map(
      (student) => `
        <button class="profile-card" data-student-id="${escapeHtml(student.id)}">
          <span class="profile-card__title">${escapeHtml(student.name)}</span>
          <span class="profile-card__meta">${escapeHtml(student.grade)}</span>
        </button>
      `
    )
    .join("");

  const studentList = document.querySelector("[data-student-options]");
  const openTeacherButton = document.querySelector("[data-open-teacher]");

  studentList.innerHTML = studentOptions;

  studentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-id]");
    if (!button) return;

    setStudentViewer(button.dataset.studentId);
    window.location.href = "student-dashboard.html";
  });

  openTeacherButton.addEventListener("click", () => {
    const viewer = getViewer();
    const teacherId =
      viewer.role === "teacher" && viewer.teacherId
        ? viewer.teacherId
        : (data.teachers?.[0]?.id || "teacher-1");

    setTeacherViewer(teacherId);
    window.location.href = "teacher-dashboard.html";
  });
}

function renderStudentDashboard() {
  const data = readData();
  const viewer = getViewer();
  const currentStudent =
    getStudentById(data, viewer.studentId) || data.students[0] || null;

  if (!currentStudent) return;

  setStudentViewer(currentStudent.id);

  const subjectFilter = document.querySelector("[data-subject-filter]");
  const switchStudent = document.querySelector("[data-switch-student]");
  const topicsContainer = document.querySelector("[data-student-topics]");
  const studentName = document.querySelector("[data-student-name]");

  studentName.textContent = currentStudent.name;

  switchStudent.innerHTML = data.students
    .map(
      (student) => `
        <option value="${escapeHtml(student.id)}" ${
          student.id === currentStudent.id ? "selected" : ""
        }>
          ${escapeHtml(student.name)}
        </option>
      `
    )
    .join("");

  const subjects = getSubjects(data);

  subjectFilter.innerHTML = [
    `<option value="all">Todas as materias</option>`,
    ...subjects.map(
      (subject) =>
        `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`
    ),
  ].join("");

  function updateTopicList() {
    const selectedSubject = subjectFilter.value;
    const studentTopics = data.topics
      .filter((topic) => topic.studentId === currentStudent.id)
      .filter(
        (topic) => selectedSubject === "all" || topic.subject === selectedSubject
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!studentTopics.length) {
      topicsContainer.innerHTML =
        '<p class="empty-state">Nenhuma atividade encontrada para este filtro.</p>';
      return;
    }

    topicsContainer.innerHTML = studentTopics
      .map((topic) => {
        const progress = buildTopicProgress(topic, currentStudent.id);
        const progressPercent = progress.total
          ? Math.round((progress.completed / progress.total) * 100)
          : 0;
        return `
          <article class="card mission-card">
            <div class="card__header">
              <span class="badge">${escapeHtml(topic.subject)}</span>
            </div>
            <h3>${escapeHtml(topic.title)}</h3>
            <p>${escapeHtml(topic.description)}</p>
            <div class="progress-track" aria-hidden="true">
              <span class="progress-track__fill" style="width: ${progressPercent}%"></span>
            </div>
            <div class="card__footer card__footer--stack">
              <span>${progress.completed}/${progress.total} etapas concluidas</span>
              <a class="button button--ghost" href="student-topic.html?topic=${encodeURIComponent(
                topic.id
              )}">Abrir atividade</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  subjectFilter.addEventListener("change", updateTopicList);

  switchStudent.addEventListener("change", () => {
    setStudentViewer(switchStudent.value);
    window.location.reload();
  });

  updateTopicList();
}

function renderStudentTopic() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic");
  const data = readData();
  const viewer = getViewer();
  const topic = getTopicById(data, topicId);
  const student = getStudentById(data, viewer.studentId) || data.students[0];

  if (!topic || !student) {
    document.querySelector("[data-topic-content]").innerHTML =
      '<p class="empty-state">Atividade nao encontrada.</p>';
    return;
  }

  const content = document.querySelector("[data-topic-content]");
  const progress = buildTopicProgress(topic, student.id);

  content.innerHTML = `
    <section class="detail-header">
      <div class="card__header">
        <span class="badge">${escapeHtml(topic.subject)}</span>
      </div>
      <h1>${escapeHtml(topic.title)}</h1>
      <p>${escapeHtml(topic.description)}</p>
      <div class="progress-track" aria-hidden="true">
        <span class="progress-track__fill" style="width: ${
          progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
        }%"></span>
      </div>
      <p class="detail-meta">Aluno: ${escapeHtml(student.name)} | Criado em ${formatDate(
    topic.createdAt
  )}</p>
      ${Array.isArray(topic.supportMaterial) ? topic.supportMaterial : [topic.supportMaterial || ""]
        .filter(url => url && isSafeUrl(url))
        .map(url => `<a class="button button--ghost" target="_blank" rel="noreferrer" href="${escapeHtml(url)}">Abrir material de apoio</a>`)
        .join(" ")}
    </section>
    <section class="detail-body">
      <h2>Exemplos</h2>
      <p class="detail-meta">${progress.completed}/${progress.total} concluidos</p>
      <div class="checklist">
        ${topic.examples
          .map(
            (example) => `
              <label class="checklist__item">
                <input
                  type="checkbox"
                  data-example-id="${escapeHtml(example.id)}"
                  ${
                    example.doneByStudentIds.includes(student.id) ? "checked" : ""
                  }
                />
                <span>${escapeHtml(example.text)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;

  content.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-example-id]");
    if (!checkbox) return;

    const freshData = readData();
    const freshTopic = getTopicById(freshData, topicId);
    const example = freshTopic.examples.find(
      (item) => item.id === checkbox.dataset.exampleId
    );

    if (!example) return;

    if (checkbox.checked) {
      if (!example.doneByStudentIds.includes(student.id)) {
        example.doneByStudentIds.push(student.id);
      }
    } else {
      example.doneByStudentIds = example.doneByStudentIds.filter(
        (id) => id !== student.id
      );
    }

    saveData(freshData);
    window.location.reload();
  });
}

function renderTeacherDashboard() {
  if (!ensureTeacherAccess()) return;

  const data = readData();
  const viewer = getViewer();
  const currentTeacher =
    getTeacherById(data, viewer.teacherId) || data.teachers[0] || null;
  const list = document.querySelector("[data-teacher-topics]");
  const summary = document.querySelector("[data-teacher-summary]");

  const teacherLabel = currentTeacher
    ? `${escapeHtml(currentTeacher.name)} — ${escapeHtml(currentTeacher.subject)}`
    : "Professor";

  summary.textContent = `${teacherLabel} — ${data.topics.length} atividades cadastradas para ${data.students.length} alunos`;

  if (!data.topics.length) {
    list.innerHTML =
      '<p class="empty-state">Nenhuma atividade criada ainda. Use o botao acima para cadastrar a primeira.</p>';
    return;
  }

  list.innerHTML = data.topics
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((topic) => {
      const student = getStudentById(data, topic.studentId);
      const progress = buildTopicProgress(topic, topic.studentId);

      return `
        <article class="card mission-card">
          <div class="card__header">
            <span class="badge">${escapeHtml(topic.subject)}</span>
          </div>
          <h3>${escapeHtml(topic.title)}</h3>
          <p>${escapeHtml(topic.description)}</p>
          <div class="progress-track" aria-hidden="true">
            <span class="progress-track__fill" style="width: ${
              progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
            }%"></span>
          </div>
          <div class="card__footer">
            <span>${escapeHtml(student ? student.name : "Aluno nao encontrado")}</span>
            <div class="card__footer card__footer--stack">
              <span>${progress.completed}/${progress.total} concluidos</span>
              <a class="button button--ghost" href="teacher-create-topic.html?edit=${encodeURIComponent(
                topic.id
              )}">Editar</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTeacherCreateTopic() {
  if (!ensureTeacherAccess()) return;

  const data = readData();
  const params = new URLSearchParams(window.location.search);
  const editingTopicId = params.get("edit");
  const editingTopic = editingTopicId ? getTopicById(data, editingTopicId) : null;
  const form = document.querySelector("[data-topic-form]");
  const studentSelect = document.querySelector("[data-student-select]");
  const subjectSelect = document.querySelector("[data-subject-select]");
  const examplesInput = document.querySelector("[data-examples-input]");
  const status = document.querySelector("[data-form-status]");
  const modeBadge = document.querySelector("[data-form-mode-badge]");
  const modeTitle = document.querySelector("[data-form-mode-title]");
  const submitLabel = document.querySelector("[data-submit-label]");
  const deleteButton = document.querySelector("[data-delete-activity]");
  const addMaterialButton = document.querySelector("[data-add-material]");
  const materialsContainer = document.querySelector("[data-support-materials-container]");

  function createMaterialInput(url = "") {
    const item = document.createElement("div");
    item.className = "support-material-item";
    item.innerHTML = `
      <input type="url" name="supportMaterial[]" placeholder="https://..." value="${escapeHtml(url)}" required />
      <button type="button" class="button button--small button--danger" data-remove-material>Remover</button>
    `;
    return item;
  }

  function updateRemoveButtons() {
    const items = materialsContainer.querySelectorAll(".support-material-item");
    items.forEach((item, index) => {
      const removeBtn = item.querySelector("[data-remove-material]");
      removeBtn.hidden = items.length <= 1;
    });
  }

  addMaterialButton.addEventListener("click", () => {
    materialsContainer.appendChild(createMaterialInput());
    updateRemoveButtons();
  });

  materialsContainer.addEventListener("click", (event) => {
    if (event.target.matches("[data-remove-material]")) {
      event.target.closest(".support-material-item").remove();
      updateRemoveButtons();
    }
  });

  studentSelect.innerHTML = data.students
    .map(
      (student) => `
        <option value="${escapeHtml(student.id)}">
          ${escapeHtml(student.name)} - ${escapeHtml(student.grade)}
        </option>
      `
    )
    .join("");

  subjectSelect.innerHTML = getSubjects(data)
    .map(
      (subject) => `
        <option value="${escapeHtml(subject)}">
          ${escapeHtml(subject)}
        </option>
      `
    )
    .join("");

  if (editingTopic) {
    modeBadge.textContent = "Editando atividade";
    modeTitle.textContent = "Editar atividade";
    submitLabel.textContent = "Salvar alterações";
    deleteButton.hidden = false;
    deleteButton.style.display = "inline-block"; // Garantir que apareça

    form.elements.title.value = editingTopic.title;
    form.elements.subject.value = editingTopic.subject;
    form.elements.studentId.value = editingTopic.studentId;
    form.elements.description.value = editingTopic.description;
    examplesInput.value = editingTopic.examples.map((example) => example.text).join("\n");

    // Handle support materials
    const materials = Array.isArray(editingTopic.supportMaterial)
      ? editingTopic.supportMaterial
      : [editingTopic.supportMaterial || ""];
    materialsContainer.innerHTML = "";
    materials.forEach((url) => {
      materialsContainer.appendChild(createMaterialInput(url));
    });
    updateRemoveButtons();

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Tem certeza que deseja excluir esta atividade? Esta acao nao pode ser desfeita."
      );

      if (!confirmed) return;

      const freshData = readData();
      freshData.topics = freshData.topics.filter((topic) => topic.id !== editingTopic.id);
      saveData(freshData);
      window.location.href = "teacher-dashboard.html";
    });
  } else {
    // Nova atividade
    modeBadge.textContent = "Nova atividade";
    modeTitle.textContent = "Criar atividade";
    submitLabel.textContent = "Criar Atividade";
    deleteButton.hidden = true;
    deleteButton.style.display = "none"; // Garantir que não apareça

    // Initialize with one empty field
    materialsContainer.innerHTML = "";
    materialsContainer.appendChild(createMaterialInput());
    updateRemoveButtons();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const supportMaterials = formData.getAll("supportMaterial[]").map(url => url.trim()).filter(Boolean);
    const examplesTextList = String(formData.get("examples") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!supportMaterials.length || !supportMaterials.every(isSafeUrl)) {
      status.textContent = "Informe pelo menos um link de apoio válido com http:// ou https://.";
      return;
    }

    const freshData = readData();
    const topicId = editingTopic ? editingTopic.id : `topic-${Date.now()}`;
    const oldExamples = editingTopic ? editingTopic.examples : [];
    const examples = examplesTextList.map((text, index) => ({
      id: oldExamples[index]?.id || `ex-${Date.now()}-${index}`,
      text,
      doneByStudentIds: oldExamples[index]?.doneByStudentIds || [],
    }));

    const nextTopic = {
      id: topicId,
      title: String(formData.get("title") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      studentId: String(formData.get("studentId") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      supportMaterial: supportMaterials,
      createdAt: editingTopic ? editingTopic.createdAt : new Date().toISOString(),
      examples,
    };

    if (editingTopic) {
      const topicIndex = freshData.topics.findIndex((topic) => topic.id === editingTopic.id);
      if (topicIndex !== -1) {
        freshData.topics[topicIndex] = nextTopic;
      }
    } else {
      freshData.topics.push(nextTopic);
    }

    saveData(freshData);

    if (editingTopic) {
      window.location.href = "teacher-dashboard.html";
      return;
    }

    form.reset();
    materialsContainer.innerHTML = "";
    materialsContainer.appendChild(createMaterialInput());
    updateRemoveButtons();
    status.textContent = "Atividade criada com sucesso.";
  });
}

function renderSettingsPage() {
  const data = readData();
  const viewer = getViewer();
  const details = document.querySelector("[data-settings-details]");
  const teacherSelectContainer = document.querySelector("[data-teacher-select-container]");
  const contactButton = document.querySelector("[data-contact]");

  if (viewer.role === "teacher") {
    const currentTeacher = getTeacherById(data, viewer.teacherId) || data.teachers[0];

    details.innerHTML = `
      <h1>${escapeHtml(currentTeacher.name)}</h1>
      <p>Perfil atual: Professor</p>
      <p>Materia principal: ${escapeHtml(currentTeacher.subject)}</p>
    `;

    teacherSelectContainer.innerHTML = `
      <label for="teacher-profile-select">Escolha seu perfil</label>
      <select id="teacher-profile-select" data-teacher-select>
        ${data.teachers
          .map(
            (teacher) => `
              <option value="${escapeHtml(teacher.id)}" ${
                teacher.id === currentTeacher.id ? "selected" : ""
              }>
                ${escapeHtml(teacher.name)} — ${escapeHtml(teacher.subject)}
              </option>
            `
          )
          .join("")}
      </select>
    `;

    const teacherSelect = document.querySelector("[data-teacher-select]");
    teacherSelect.addEventListener("change", () => {
      setTeacherViewer(teacherSelect.value);
      window.location.reload();
    });
  } else {
    const student = getStudentById(data, viewer.studentId) || data.students[0];
    details.innerHTML = `
      <h1>${escapeHtml(student.name)}</h1>
      <p>Perfil atual: Aluno</p>
      <p>Turma: ${escapeHtml(student.grade)}</p>
    `;

    teacherSelectContainer.innerHTML = "";
  }

  if (contactButton) {
    contactButton.addEventListener("click", () => {
      window.open(
        'mailto:luizpedro0x@gmail.com?subject=Contato%20Study%20Connect&body=Ol%C3%A1,%20gostaria%20de%20entrar%20em%20contato%20com%20voc%C3%AA.',
        "_blank"
      );
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "index") renderIndexPage();
  if (page === "student-dashboard") renderStudentDashboard();
  if (page === "student-topic") renderStudentTopic();
  if (page === "teacher-dashboard") renderTeacherDashboard();
  if (page === "teacher-create-topic") renderTeacherCreateTopic();
  if (page === "settings") renderSettingsPage();
});
