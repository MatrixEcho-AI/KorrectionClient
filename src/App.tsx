import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Preferences } from '@capacitor/preferences';
import { enableKeepAwake, disableKeepAwake } from '@/utils/keepAwake';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import QuestionNew from '@/pages/QuestionNew';
import QuestionDetail from '@/pages/QuestionDetail';
import Summary from '@/pages/Summary';
import Review from '@/pages/Review';
import Redo from '@/pages/Redo';
import Categories from '@/pages/Categories';
import Subjects from '@/pages/Subjects';
import Settings from '@/pages/Settings';
import ExportPage from '@/pages/ExportPage';
import PdfHistory from '@/pages/PdfHistory';
import Trash from '@/pages/Trash';
import BatchReview from '@/pages/BatchReview';

function App() {
  const { init, token, isLoading } = useAuthStore();

  useEffect(() => {
    init();
    Preferences.get({ key: 'keep_awake' }).then(({ value }) => {
      if (value === 'true') {
        enableKeepAwake();
      } else {
        disableKeepAwake();
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto h-screen max-w-md overflow-hidden bg-white shadow-xl">
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Home /> : <Navigate to="/login" />} />
        <Route path="/questions/new" element={token ? <QuestionNew /> : <Navigate to="/login" />} />
        <Route path="/questions/:id" element={token ? <QuestionDetail /> : <Navigate to="/login" />} />
        <Route path="/questions/:id/summary" element={token ? <Summary /> : <Navigate to="/login" />} />
        <Route path="/questions/:id/review" element={token ? <Review /> : <Navigate to="/login" />} />
        <Route path="/questions/:id/redo" element={token ? <Redo /> : <Navigate to="/login" />} />
        <Route path="/batch-review" element={token ? <BatchReview /> : <Navigate to="/login" />} />
        <Route path="/categories" element={token ? <Categories /> : <Navigate to="/login" />} />
        <Route path="/subjects" element={token ? <Subjects /> : <Navigate to="/login" />} />
        <Route path="/export" element={token ? <ExportPage /> : <Navigate to="/login" />} />
        <Route path="/pdf-history" element={token ? <PdfHistory /> : <Navigate to="/login" />} />
        <Route path="/trash" element={token ? <Trash /> : <Navigate to="/login" />} />
        <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default App;
