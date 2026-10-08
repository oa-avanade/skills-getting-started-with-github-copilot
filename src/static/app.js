document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(activity, email) {
    const participantItem = document.createElement("li");
    participantItem.className = "participant-item";

    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.setAttribute("aria-label", `Unregister ${email}`);
    removeButton.title = `Unregister ${email}`;
    removeButton.dataset.activity = activity;
    removeButton.dataset.email = email;
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v7m6-7v7" />
      </svg>
    `;

    participantItem.append(participantEmail, removeButton);
    return participantItem;
  }

  function updateActivityCard(activityCard) {
    const participantsList = activityCard.querySelector(".participants ul");
    const participantCount = participantsList.querySelectorAll(".participant-item").length;
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".availability span").textContent = `${spotsLeft} spots left`;

    const emptyState = participantsList.querySelector(".no-participants");
    if (participantCount === 0 && !emptyState) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "no-participants";
      emptyItem.textContent = "No participants yet";
      participantsList.appendChild(emptyItem);
    } else if (participantCount > 0 && emptyState) {
      emptyState.remove();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span></span></p>
          <div class="participants">
            <h5>Participants</h5>
            <ul></ul>
          </div>
        `;
        activityCard.dataset.activity = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const participantsList = activityCard.querySelector(".participants ul");
        details.participants.forEach((participant) => {
          participantsList.appendChild(createParticipantItem(name, participant));
        });
        updateActivityCard(activityCard);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
          .find((card) => card.dataset.activity === activity);
        if (activityCard) {
          const participantsList = activityCard.querySelector(".participants ul");
          participantsList.querySelector(".no-participants")?.remove();
          participantsList.appendChild(createParticipantItem(activity, email));
          updateActivityCard(activityCard);
        }
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) return;

    removeButton.disabled = true;
    const { activity, email } = removeButton.dataset;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to unregister participant");
      }

      const activityCard = removeButton.closest(".activity-card");
      removeButton.closest(".participant-item").remove();
      updateActivityCard(activityCard);
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      removeButton.disabled = false;
      console.error("Error unregistering participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
