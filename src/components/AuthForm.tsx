import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Check if this is the first user, and if so, make them an admin
    const adminsCollection = collection(firestore, 'admins');
    const adminSnapshot = await getDocs(adminsCollection);
    if (adminSnapshot.empty) {
      await setDoc(doc(firestore, 'admins', user.uid), { isAdmin: true });
      console.log('First user signed up. Promoting to admin.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSignUp) {
        await handleSignUp();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/'); // Redirect to home on successful login/signup
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};

export default AuthForm;

