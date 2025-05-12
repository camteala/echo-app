import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider,
  Outlet
} from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
//import Auth from './components/Auth';
import Room from './Room';
import './index.css'
import { AuthProvider } from './hooks/useAuth'; // Import the AuthProvider
import MFASetup from './components/User/MFA';
import SettingsPage from './components/Settings/Settings';
import ChangePasswordPage from './components/User/ChangePass';
import ForgotPassword from './components/User/ForgotPassword';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import CollabRoom from './pages/CollabRoom';
import Settings from './pages/Settings';
import HomePage from './pages/Home';
import Header from './components/HomePage/Header';
import Footer from './components/HomePage/Footer';
import AuthCallback from './handlers/AuthCallback';
import Home from './pages/Home';
import AskQuestion from './pages/AskQuestion';
import QuestionDetails from './pages/QuestionDetails';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import PostSignupMFA from './components/User/PostSignupMFA';
import ResetPassword from './components/User/ResetPassword';

const Layout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet /> {/* This is where child routes will render */}
      </main>
      <Footer />
    </>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Auth routes without header/footer */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/mfa-setup" element={<MFASetup />} />
     
      {/* <Route path="/home" element={<Home />} /> */}

      {/* Public routes with header/footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/collab" element={<CollabRoom />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/question/:id" element={<QuestionDetails />} />
        <Route path="/ask" element={<AskQuestion />} />
      </Route>

      {/* Protected routes */}
      <Route path="/home" element={<Home />} />
      <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/authentication/mfa" element={<MFASetup />} />
      <Route path="/authentication/post-signup-mfa" element={<PostSignupMFA />} /> 
           <Route path="/authentication/change-password" element={<ChangePasswordPage />} />
    </>
  ),
  {
    future: {
      v7_relativeSplatPath: true, // Opt into v7 behavior early
    },
  }
);

function App() {
  useSupabaseAuth(); // Add this line to sync auth states

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;