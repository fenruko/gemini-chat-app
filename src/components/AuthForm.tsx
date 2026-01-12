import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { UserCredential } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

// ... (imports)

// ... (component)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        await handleSignUp(email, password, username);
      } else {
        // Login logic
        let userEmail = email;
        // If the email field doesn't contain an @, assume it's a username
        if (!email.includes('@')) {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where('username', '==', email));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            setError('User not found.');
            return;
          }
          const userData = querySnapshot.docs[0].data();
          userEmail = userData.email;
        }
        await signInWithEmailAndPassword(auth, userEmail, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Create an Account' : 'Welcome Back!'}</h2>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        {isSignUp && (
            <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            />
        )}
        {isSignUp && (
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        )}
        {!isSignUp && (
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        )}
        <button type="submit">{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>
      <button onClick={handleGoogleSignIn} className="google-signin-btn">
        Sign in with Google
      </button>
      <div className="auth-links">
        <span onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </span>
        {!isSignUp && <span onClick={handleForgotPassword}>Forgot Password?</span>}
      </div>
    </div>
  );
};

export default AuthForm;

