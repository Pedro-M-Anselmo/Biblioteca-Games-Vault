// src/services.js

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";

// ─────────────────────────────────────────────
// AUTH — Google
// ─────────────────────────────────────────────

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      username: user.displayName,
      email: user.email,
      photo: user.photoURL,
      role: "user",
      banned: false,
      provider: "google",
      createdAt: serverTimestamp(),
    });
  }

  return user;
}

// ─────────────────────────────────────────────
// AUTH — Email/Senha
// ─────────────────────────────────────────────

export async function registerWithEmail(username, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;

  await updateProfile(user, { displayName: username });

  await setDoc(doc(db, "users", user.uid), {
    name: username,
    username: username,
    email: email,
    photo: null,
    role: "user",
    banned: false,
    provider: "email",
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function logoutUser() {
  await signOut(auth);
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export async function getCategories() {
  const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCategory(name) {
  const ref = await addDoc(collection(db, "categories"), {
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id, name) {
  await updateDoc(doc(db, "categories", id), { name });
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, "categories", id));
}

// ─────────────────────────────────────────────
// PLATFORMS
// ─────────────────────────────────────────────

export async function getPlatforms() {
  const snap = await getDocs(query(collection(db, "platforms"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createPlatform(name) {
  const ref = await addDoc(collection(db, "platforms"), {
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlatform(id, name) {
  await updateDoc(doc(db, "platforms", id), { name });
}

export async function deletePlatform(id) {
  await deleteDoc(doc(db, "platforms", id));
}

// ─────────────────────────────────────────────
// GAMES
// ─────────────────────────────────────────────

export async function getGames() {
  const snap = await getDocs(
    query(collection(db, "games"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGame(gameId) {
  const snap = await getDoc(doc(db, "games", gameId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createGame(data, imageFile) {
  let imageUrl = data.image || "";
  if (imageFile) imageUrl = await uploadGameImage(imageFile);

  const ref = await addDoc(collection(db, "games"), {
    ...data,
    image: imageUrl,
    reviewsEnabled: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGame(gameId, data, imageFile) {
  let updateData = { ...data };
  if (imageFile) updateData.image = await uploadGameImage(imageFile, gameId);
  await updateDoc(doc(db, "games", gameId), updateData);
}

export async function deleteGame(gameId) {
  const reviewsSnap = await getDocs(
    query(collection(db, "reviews"), where("gameId", "==", gameId))
  );
  await Promise.all(reviewsSnap.docs.map((d) => deleteDoc(doc(db, "reviews", d.id))));
  await deleteDoc(doc(db, "games", gameId));
}

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────

export async function uploadGameImage(file, gameId) {
  const path = `games/${gameId || Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────

export async function getReviewsByGame(gameId) {
  const snap = await getDocs(
    query(
      collection(db, "reviews"),
      where("gameId", "==", gameId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllReviews() {
  const snap = await getDocs(
    query(collection(db, "reviews"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserReviewForGame(userId, gameId) {
  const snap = await getDocs(
    query(
      collection(db, "reviews"),
      where("userId", "==", userId),
      where("gameId", "==", gameId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function upsertReview(userId, gameId, reviewData) {
  const existing = await getUserReviewForGame(userId, gameId);
  if (existing) {
    await updateDoc(doc(db, "reviews", existing.id), {
      ...reviewData,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  } else {
    const ref = await addDoc(collection(db, "reviews"), {
      ...reviewData,
      userId,
      gameId,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
}

export async function deleteReview(reviewId) {
  await deleteDoc(doc(db, "reviews", reviewId));
}
