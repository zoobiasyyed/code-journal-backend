import { Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { EntryForm } from './pages/EntryForm';
import { NotFound } from './pages/NotFound';
import './App.css';
import { Home } from './components/Home';
import { RegistrationForm } from './components/RegistrationForm';
import { SignInForm } from './components/SignInForm';
import { UserProvider } from './components/UserContext';

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<NavBar />}>
          <Route index element={<Home />} />
          <Route path="sign-up" element={<RegistrationForm />} />
          <Route path="sign-in" element={<SignInForm />} />
          <Route path="details/:entryId" element={<EntryForm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}
