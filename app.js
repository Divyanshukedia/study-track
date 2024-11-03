// Import the necessary Firestore functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaYvnmVlRY_gtYRcAMX1IWfJTy9eNKwaw",
  authDomain: "study-tracker-464a1.firebaseapp.com",
  projectId: "study-tracker-464a1",
  storageBucket: "study-tracker-464a1.appspot.com",
  messagingSenderId: "246688631422",
  appId: "1:246688631422:web:59e3d177221f8dcccbe62f",
  measurementId: "G-ZS46S9GRCQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variable to track the ongoing session ID
let ongoingSessionId = null;

// Check for existing sessions when the page loads
window.onload = () => {
  checkForOngoingSession();
  document.getElementById("startSessionBtn").addEventListener("click", startStudySession);
  document.getElementById("completeSessionBtn").addEventListener("click", completeSession);
};

// Function to convert to IST format
function toISTString(date) {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
}

// Function to check if there is an ongoing session
async function checkForOngoingSession() {
  const ongoingSessionRef = doc(db, "sessions", "ongoing");
  const docSnap = await getDoc(ongoingSessionRef);

  if (docSnap.exists()) {
    ongoingSessionId = docSnap.data().id;
    const startTime = new Date(docSnap.data().startTime); // Convert to Date object
    document.getElementById("open-session").style.display = "block";
    document.getElementById("ongoing-start-time").innerText = toISTString(startTime); // Format as IST
    document.getElementById("ongoing-chapter").innerText = docSnap.data().chapter; // Show chapter
    // Hide the new session form if there's an ongoing session
    document.getElementById("new-session-form").style.display = "none";
  } else {
    // Show the new session form if there's no ongoing session
    document.getElementById("new-session-form").style.display = "block";
  }
}

// Function to start a study session
async function startStudySession() {
  if (ongoingSessionId) {
    alert("You already have an ongoing study session.");
    return;
  }

  const chapter = document.getElementById("chapter").value;
  const startTime = document.getElementById("startTime").value;

  if (!chapter || !startTime) {
    alert("Please fill in both fields.");
    return;
  }

  ongoingSessionId = new Date().getTime(); // Use timestamp as a unique session ID
  const newSessionData = {
    id: ongoingSessionId,
    chapter: chapter,
    startTime: startTime, // Store start time as is; conversion will happen on display
  };

  // Store the new session in Firestore
  await setDoc(doc(db, "sessions", "ongoing"), newSessionData)
    .then(() => {
      document.getElementById("open-session").style.display = "block";
      document.getElementById("ongoing-start-time").innerText = toISTString(new Date(startTime)); // Convert to IST
      document.getElementById("ongoing-chapter").innerText = chapter; // Show chapter
      // Hide the new session form when a session starts
      document.getElementById("new-session-form").style.display = "none";
    })
    .catch(error => {
      console.error("Error starting session: ", error);
    });
}

// Function to complete the ongoing session
async function completeSession() {
  const studyDescription = document.getElementById("studyDescription").value;

  // Ensure the user provides a description
  if (!studyDescription) {
    alert("Please provide a description of what you studied.");
    return;
  }

  const endTime = new Date().toISOString();

  // Reference to the ongoing session document
  const ongoingSessionRef = doc(db, "sessions", "ongoing");
  const ongoingSessionSnap = await getDoc(ongoingSessionRef);

  // Check if there is an ongoing session
  if (!ongoingSessionSnap.exists()) {
    alert("No ongoing session found.");
    return; // Exit if no ongoing session
  }

  const ongoingSessionData = ongoingSessionSnap.data(); // Get ongoing session data

  // Prepare the completed session data
  const completedSessionData = {
    id: ongoingSessionId,
    description: studyDescription,
    endTime: endTime,
    chapter: ongoingSessionData.chapter, // Save chapter from ongoing session
    startTime: ongoingSessionData.startTime // Save start time from ongoing session
  };

  try {
    // Store the completed session in Firestore under a new document
    await setDoc(doc(db, "sessions", `completed_${ongoingSessionId}`), completedSessionData);
    
    // If completed session is stored successfully, delete the ongoing session document
    await deleteDoc(ongoingSessionRef); // This line deletes the ongoing session
    
    alert("Session completed and saved successfully.");
    document.getElementById("open-session").style.display = "none";
    document.getElementById("studyDescription").value = '';
    ongoingSessionId = null;

    // Reset the fields in the new session form
    document.getElementById("chapter").value = '';
    document.getElementById("startTime").value = '';

    // Show the new session form after completing a session
    document.getElementById("new-session-form").style.display = "block";
  } catch (error) {
    console.error("Error completing session: ", error);
  }
}



// Function to fetch study history from Firestore and populate the table
async function fetchStudyHistory() {
    const historyTableBody = document.getElementById("historyTable").getElementsByTagName("tbody")[0];
    
    // Clear the current table data
    historyTableBody.innerHTML = '';
  
    const completedSessionsRef = collection(db, "sessions");
    const completedSessionsSnap = await getDocs(completedSessionsRef);
  
    let totalStudyTime = 0; // To calculate total study time
    let count = 0; // To calculate average study time
  
    completedSessionsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.id && data.startTime && data.endTime) {
        const startTime = new Date(data.startTime);
        const endTime = new Date(data.endTime);
        const duration = Math.round((endTime - startTime) / (1000 * 60)); // Duration in minutes
  
        // Append a new row to the table
        const row = historyTableBody.insertRow();
        row.insertCell(0).innerText = data.chapter;
        row.insertCell(1).innerText = toISTString(startTime);
        row.insertCell(2).innerText = toISTString(endTime);
        row.insertCell(3).innerText = duration;
        row.insertCell(4).innerText = data.description; // Assuming 'description' holds the summary
  
        // Accumulate total study time and count
        totalStudyTime += duration;
        count++;
      }
    });
  
    // Update total and average study time in the UI
    document.getElementById("totalStudyTime").innerText = `Total Study Time: ${totalStudyTime} minutes`;
    const averageStudyTime = count > 0 ? (totalStudyTime / count).toFixed(2) : 0;
    document.getElementById("averageStudyTime").innerText = `Average Study Time: ${averageStudyTime} minutes`;
  }
  

  
  // Load the study history when the page loads
  window.onload = () => {
    fetchStudyHistory();
  };