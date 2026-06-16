import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxfBeahH1rDfSzvz5LyAswJpMtgqy97Vk",
  authDomain: "wc-tracker-nhom.firebaseapp.com",
  projectId: "wc-tracker-nhom",
  storageBucket: "wc-tracker-nhom.firebasestorage.app",
  messagingSenderId: "916626680795",
  appId: "1:916626680795:web:68f2bb47502a0d728ed5fe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
  const querySnapshot = await getDocs(collection(db, "matches"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const matchDate = data.matchDate;
    if (!matchDate) {
      console.log(`Match ID: ${doc.id} has MISSING matchDate!`);
    } else {
      const d = matchDate.toDate ? matchDate.toDate() : new Date(matchDate);
      if (isNaN(d.getTime())) {
        console.log(`Match ID: ${doc.id} has INVALID matchDate:`, matchDate);
      }
    }
  });
  console.log("Date check complete.");
} catch (err) {
  console.error("Error:", err);
}
process.exit(0);
