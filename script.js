// DOM Elements
const examDateInput = document.getElementById("examDate");
const saveExamDateBtn = document.getElementById("saveExamDateBtn");
const examDateDisplay = document.getElementById("examDateDisplay");
const currentExamDateSpan = document.getElementById("currentExamDate");
const daysRemainingSpan = document.getElementById("daysRemaining");
const topicNameInput = document.getElementById("topicName");
const dateLearnedInput = document.getElementById("dateLearned");
const addTopicBtn = document.getElementById("addTopicBtn");
const topicsContainer = document.getElementById("topicsContainer");
const noTopicsMessage = document.getElementById("noTopicsMessage");
const progressFill = document.getElementById("progressFill");
const progressPercentage = document.getElementById("progressPercentage");
const totalTopicsSpan = document.getElementById("totalTopics");
const completedTopicsSpan = document.getElementById("completedTopics");
const upcomingTopicsSpan = document.getElementById("upcomingTopics");
const overdueTopicsSpan = document.getElementById("overdueTopics");

// State
let examDate = null;
let topics = [];

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadExamDate();
  loadTopics();
  updateProgress();

  // Set default date inputs to today
  const today = new Date().toISOString().split("T")[0];
  dateLearnedInput.value = today;
  examDateInput.min = today;
});

// Event Listeners
saveExamDateBtn.addEventListener("click", saveExamDate);
addTopicBtn.addEventListener("click", addTopic);

// Functions
function loadExamDate() {
  const savedExamDate = localStorage.getItem("examDate");
  if (savedExamDate) {
    examDate = new Date(savedExamDate);
    examDateInput.value = examDate.toISOString().split("T")[0];
    updateExamDateDisplay();
  }
}

function loadTopics() {
  const savedTopics = localStorage.getItem("topics");
  if (savedTopics) {
    topics = JSON.parse(savedTopics);
    renderTopics();
  }
}

function saveExamDate() {
  const selectedDate = examDateInput.value;
  if (!selectedDate) {
    showNotification("Please select an exam date", "error");
    return;
  }

  const newExamDate = new Date(selectedDate);
  const oldExamDate = examDate ? new Date(examDate) : null;
  examDate = newExamDate;
  localStorage.setItem("examDate", examDate.toISOString());
  showNotification("Exam date saved successfully!", "success");

  // Recalculate review dates for all topics if exam date changed
  if (!oldExamDate || oldExamDate.getTime() !== newExamDate.getTime()) {
    recalculateReviewDates(oldExamDate, newExamDate);
  }

  updateExamDateDisplay();
  loadTopics();
  updateProgress();
}

function recalculateReviewDates(oldExamDate, newExamDate) {
  if (!topics.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  topics.forEach((topic) => {
    // Skip if topic has no review dates or was learned after the new exam date
    const dateLearned = new Date(topic.dateLearned);
    if (
      !topic.reviewDates ||
      topic.reviewDates.length === 0 ||
      dateLearned >= newExamDate
    ) {
      return;
    }

    // Remove any review dates that are after the new exam date
    topic.reviewDates = topic.reviewDates.filter((dateStr) => {
      const date = new Date(dateStr);
      return date <= newExamDate;
    });

    // If we removed all review dates or need to compress the schedule
    const daysUntilExam = Math.floor(
      (newExamDate - dateLearned) / (1000 * 60 * 60 * 24)
    );

    // Calculate new compressed intervals if needed
    if (
      oldExamDate &&
      daysUntilExam < (oldExamDate - dateLearned) / (1000 * 60 * 60 * 24)
    ) {
      const compressedIntervals = calculateCompressedIntervals(daysUntilExam);

      // Keep completed reviews
      const completedReviews = topic.completedReviews || [];

      // Generate new review dates
      const newReviewDates = [];
      let lastDate = dateLearned;

      compressedIntervals.forEach((interval) => {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + interval);

        // Only add dates that are in the future and before exam date
        if (nextDate <= newExamDate) {
          newReviewDates.push(nextDate.toISOString().split("T")[0]);
          lastDate = nextDate;
        }
      });

      // Filter out dates that are already completed
      topic.reviewDates = newReviewDates.filter(
        (date) => !completedReviews.some((completed) => completed.date === date)
      );
    }
  });

  // Save the updated topics
  localStorage.setItem("topics", JSON.stringify(topics));
  showNotification("Review completed!", "success");
  showNotification("Topic added successfully!", "success");
}

function updateExamDateDisplay() {
  if (examDate) {
    examDateDisplay.classList.remove("hidden");
    currentExamDateSpan.textContent = examDate.toLocaleDateString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = examDate - today;
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    daysRemainingSpan.textContent = daysRemaining;

    if (daysRemaining < 7) {
      daysRemainingSpan.classList.add("text-red-600");
    } else if (daysRemaining < 14) {
      daysRemainingSpan.classList.add("text-yellow-600");
    } else {
      daysRemainingSpan.classList.add("text-green-600");
    }
  }
}

function addTopic() {
  const name = topicNameInput.value.trim();
  const dateLearned = dateLearnedInput.value;

  if (!name || !dateLearned) {
    showNotification("Please fill in all fields", "error");
    return;
  }

  if (examDate) {
    const examDateObj = new Date(examDate);
    const learnedDateObj = new Date(dateLearned);

    if (learnedDateObj > examDateObj) {
      alert("Date learned cannot be after the exam date");
      return;
    }

    const daysUntilExam = Math.floor(
      (examDateObj - learnedDateObj) / (1000 * 60 * 60 * 24)
    );
    const intervals = calculateCompressedIntervals(daysUntilExam);

    const reviewDates = [];
    let lastDate = learnedDateObj;

    intervals.forEach((interval) => {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + interval);

      if (nextDate <= examDateObj) {
        reviewDates.push(nextDate.toISOString().split("T")[0]);
        lastDate = nextDate;
      }
    });

    const newTopic = {
      id: Date.now(),
      name,
      dateLearned,
      reviewDates,
      completedReviews: [],
    };

    topics.push(newTopic);
    localStorage.setItem("topics", JSON.stringify(topics));
    showNotification("Topic added successfully!", "success");

    // Clear inputs
    topicNameInput.value = "";
    dateLearnedInput.value = new Date().toISOString().split("T")[0];

    loadTopics();
    updateProgress();
  } else {
    showNotification("Please set an exam date first", "error");
  }
}

function calculateCompressedIntervals(daysUntilExam) {
  // Default intervals for spaced repetition (in days)
  const idealIntervals = [1, 3, 7, 14, 30, 60, 90];

  // Filter out intervals that would exceed the exam date
  let cumulativeDays = 0;
  const compressedIntervals = [];

  for (let i = 0; i < idealIntervals.length; i++) {
    const interval = idealIntervals[i];
    if (cumulativeDays + interval <= daysUntilExam) {
      compressedIntervals.push(interval);
      cumulativeDays += interval;
    } else {
      // Try to distribute remaining days
      const remainingDays = daysUntilExam - cumulativeDays;
      if (remainingDays > 0 && i > 0) {
        // Add a proportionally smaller interval
        const adjustedInterval = Math.max(
          1,
          Math.floor(remainingDays / (idealIntervals.length - i))
        );
        compressedIntervals.push(adjustedInterval);
        cumulativeDays += adjustedInterval;
      }
      break;
    }
  }

  return compressedIntervals;
}

function renderTopics() {
  if (topics.length === 0) {
    noTopicsMessage.classList.remove("hidden");
    topicsContainer.innerHTML = "";
    topicsContainer.appendChild(noTopicsMessage);
    return;
  }

  noTopicsMessage.classList.add("hidden");
  topicsContainer.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  topics.forEach((topic) => {
    const topicElement = document.createElement("div");
    topicElement.className =
      "review-card bg-white p-4 rounded-lg shadow hover:shadow-md border-l-4 border-indigo-500";

    // Find the next review date
    let nextReviewDate = null;
    let isOverdue = false;
    let completedCount = topic.completedReviews
      ? topic.completedReviews.length
      : 0;
    let totalReviews = completedCount;

    if (topic.reviewDates && topic.reviewDates.length > 0) {
      // Sort dates to find the next one
      const sortedDates = [...topic.reviewDates].sort();
      for (const dateStr of sortedDates) {
        const date = new Date(dateStr);
        if (date >= today) {
          nextReviewDate = date;
          break;
        } else {
          isOverdue = true;
        }
      }
      totalReviews += topic.reviewDates.length;
    }

    // Calculate progress
    const progress =
      totalReviews > 0 ? Math.round((completedCount / totalReviews) * 100) : 0;

    // Status badge
    let statusBadge = "";
    if (completedCount === totalReviews) {
      statusBadge =
        '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Completed</span>';
    } else if (isOverdue) {
      statusBadge =
        '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Overdue</span>';
    } else if (nextReviewDate) {
      const daysUntilReview = Math.floor(
        (nextReviewDate - today) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilReview <= 3) {
        statusBadge = `<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Due in ${daysUntilReview} day${
          daysUntilReview !== 1 ? "s" : ""
        }</span>`;
      } else {
        statusBadge = `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Upcoming</span>`;
      }
    }

    // Progress bar
    const progressBar = `
              <div class="mt-2">
                  <div class="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>${progress}%</span>
                  </div>
                  <div class="progress-bar">
                      <div class="progress-fill bg-indigo-500" style="width: ${progress}%"></div>
                  </div>
              </div>
          `;

    // Review dates list
    let reviewsList = '<div class="mt-3 text-sm">';
    if (topic.completedReviews && topic.completedReviews.length > 0) {
      reviewsList +=
        '<p class="font-medium text-gray-700 mb-1">Completed Reviews:</p>';
      reviewsList += '<ul class="list-disc list-inside text-gray-600">';
      topic.completedReviews.forEach((review) => {
        reviewsList += `<li>${new Date(review.date).toLocaleDateString()}</li>`;
      });
      reviewsList += "</ul>";
    }

    if (topic.reviewDates && topic.reviewDates.length > 0) {
      reviewsList +=
        '<p class="font-medium text-gray-700 mt-2 mb-1">Upcoming Reviews:</p>';
      reviewsList += '<ul class="list-disc list-inside text-gray-600">';
      topic.reviewDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        const isPast = date < today;
        reviewsList += `<li class="${
          isPast ? "text-red-500" : ""
        }">${date.toLocaleDateString()} ${isPast ? "(Overdue)" : ""}</li>`;
      });
      reviewsList += "</ul>";
    }
    reviewsList += "</div>";

    // Buttons
    const buttons = `
              <div class="mt-4 flex justify-between">
                  <button onclick="completeNextReview(${
                    topic.id
                  })" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition ${
      !nextReviewDate ? "opacity-50 cursor-not-allowed" : ""
    }" ${!nextReviewDate ? "disabled" : ""}>
                      <i class="fas fa-check mr-1"></i> Complete
                  </button>
                  <button onclick="showDeleteConfirmation(${
                    topic.id
                  }, this)" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                      <i class="fas fa-trash mr-1"></i> Delete
                  </button>
                  <div class="delete-confirmation hidden absolute right-0 bottom-full mb-2 bg-white shadow-lg rounded-md p-3 border border-gray-200 z-10">
                      <p class="text-sm text-gray-700 mb-2">Are you sure you want to delete this topic?</p>
                      <div class="flex justify-end space-x-2">
                          <button onclick="hideDeleteConfirmation(this)" class="text-sm px-2 py-1 rounded hover:bg-gray-100">Cancel</button>
                          <button onclick="confirmDeleteTopic(${
                            topic.id
                          }, this)" class="bg-red-500 text-white text-sm px-2 py-1 rounded hover:bg-red-600">Delete</button>
                      </div>
                  </div>
              </div>
          `;

    topicElement.innerHTML = `
              <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-lg text-gray-800">${
                    topic.name
                  }</h3>
                  ${statusBadge}
              </div>
              <p class="text-sm text-gray-600 mt-1">Learned: ${new Date(
                topic.dateLearned
              ).toLocaleDateString()}</p>
              ${progressBar}
              ${reviewsList}
              ${buttons}
          `;

    topicsContainer.appendChild(topicElement);
  });
}

function completeNextReview(topicId) {
  const topicIndex = topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) return;

  const topic = topics[topicIndex];
  const today = new Date().toISOString().split("T")[0];

  // Find the earliest review date that is today or in the past
  let reviewDateToComplete = null;
  if (topic.reviewDates && topic.reviewDates.length > 0) {
    const sortedDates = [...topic.reviewDates].sort();
    for (const dateStr of sortedDates) {
      if (dateStr <= today) {
        reviewDateToComplete = dateStr;
        break;
      }
    }
  }

  if (!reviewDateToComplete) {
    showNotification("No reviews to complete yet", "error");
    return;
  }

  // Add to completed reviews
  if (!topic.completedReviews) {
    topic.completedReviews = [];
  }

  topic.completedReviews.push({
    date: reviewDateToComplete,
    completedAt: new Date().toISOString(),
  });

  // Remove from upcoming reviews
  topic.reviewDates = topic.reviewDates.filter(
    (date) => date !== reviewDateToComplete
  );

  // Save and update
  localStorage.setItem("topics", JSON.stringify(topics));
  loadTopics();
  updateProgress();
}

function showDeleteConfirmation(topicId, button) {
  // Hide any other open confirmations
  document.querySelectorAll(".delete-confirmation").forEach((el) => {
    el.classList.add("hidden");
  });

  const confirmation = button.nextElementSibling;
  confirmation.classList.remove("hidden");
}

function hideDeleteConfirmation(button) {
  const confirmation = button.closest(".delete-confirmation");
  confirmation.classList.add("hidden");
}

function confirmDeleteTopic(topicId, button) {
  topics = topics.filter((t) => Number(t.id) !== Number(topicId));
  localStorage.setItem("topics", JSON.stringify(topics));
  loadTopics();
  updateProgress();
  showNotification("Topic deleted successfully", "success");
}

function updateProgress() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalTopics = topics.length;
  let completedTopics = 0;
  let upcomingTopics = 0;
  let overdueTopics = 0;
  let totalProgress = 0;

  topics.forEach((topic) => {
    // Calculate topic progress
    const completedCount = topic.completedReviews
      ? topic.completedReviews.length
      : 0;
    const totalReviews =
      completedCount + (topic.reviewDates ? topic.reviewDates.length : 0);
    const progress = totalReviews > 0 ? completedCount / totalReviews : 0;
    totalProgress += progress;

    // Count status
    if (completedCount === totalReviews) {
      completedTopics++;
    } else if (topic.reviewDates && topic.reviewDates.length > 0) {
      let hasOverdue = false;
      for (const dateStr of topic.reviewDates) {
        const date = new Date(dateStr);
        if (date < today) {
          hasOverdue = true;
          break;
        }
      }

      if (hasOverdue) {
        overdueTopics++;
      } else {
        upcomingTopics++;
      }
    } else {
      upcomingTopics++;
    }
  });

  // Update UI
  totalTopicsSpan.textContent = totalTopics;
  completedTopicsSpan.textContent = completedTopics;
  upcomingTopicsSpan.textContent = upcomingTopics;
  overdueTopicsSpan.textContent = overdueTopics;

  const overallProgress =
    totalTopics > 0 ? Math.round((totalProgress / totalTopics) * 100) : 0;
  progressPercentage.textContent = `${overallProgress}%`;
  progressFill.style.width = `${overallProgress}%`;

  // Change color based on progress
  if (overallProgress < 30) {
    progressFill.className = "progress-fill bg-red-500";
  } else if (overallProgress < 70) {
    progressFill.className = "progress-fill bg-yellow-500";
  } else {
    progressFill.className = "progress-fill bg-green-500";
  }
}

// Notification system
function showNotification(message, type) {
  const container = document.getElementById("notificationContainer");
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  notification.innerHTML = `
          <span>${message}</span>
          <button class="notification-close">&times;</button>
      `;

  container.appendChild(notification);

  // Auto-remove after 4 seconds with fade out
  const timer = setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 4000);

  // Close button handler
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      clearTimeout(timer);
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    });
}

// Replace all alert() calls with showNotification()
// Example replacements:
// alert('Please select an exam date') → showNotification('Please select an exam date', 'error')
// alert('Topic saved successfully!') → showNotification('Topic saved successfully!', 'success')

// Make functions available globally
window.completeNextReview = completeNextReview;
window.deleteTopic = deleteTopic;
window.showNotification = showNotification;
