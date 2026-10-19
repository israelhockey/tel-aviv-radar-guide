import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Now from "./pages/Now";
import Live from "./pages/Live";
import WhatsOn from "./pages/WhatsOn";
import News from "./pages/News";
import Beach from "./pages/Beach";
import Food from "./pages/Food";
import Shabbat from "./pages/Shabbat";
import GettingAround from "./pages/GettingAround";
import Guide from "./pages/Guide";
import CinemaPage from "./pages/CinemaPage";
import Magazine from "./pages/Magazine";
import ArticlePage from "./pages/ArticlePage";
import PlacePage from "./pages/PlacePage";
import { Hotels, HotelPage } from "./pages/Hotels";
import { Walks, WalkPage } from "./pages/Walks";
import EventPage from "./pages/EventPage";
import AreaPage from "./pages/Area";
import Jobs from "./pages/Jobs";
import Weekend from "./pages/Weekend";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import Category from "./pages/Category";
import Post from "./pages/Post";
import Submit from "./pages/Submit";
import Auth from "./pages/Auth";
import AdminOverview from "./pages/admin/AdminOverview";
import ImportCenter from "./pages/admin/ImportCenter";
import ReviewQueue from "./pages/admin/ReviewQueue";
import ContentAdmin from "./pages/admin/ContentAdmin";
import NewsletterAdmin from "./pages/admin/NewsletterAdmin";
import SourcesAdmin from "./pages/admin/SourcesAdmin";
import Newsletter from "./pages/Newsletter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 2 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Now />} />
          <Route path="/live" element={<Live />} />
          <Route path="/news" element={<News />} />
          <Route path="/beach" element={<Beach />} />
          <Route path="/events" element={<WhatsOn key="events" />} />
          <Route path="/food" element={<Food />} />
          <Route path="/shabbat" element={<Shabbat />} />
          <Route path="/getting-around" element={<GettingAround />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/cinema" element={<CinemaPage />} />
          <Route path="/magazine" element={<Magazine />} />
          <Route path="/magazine/:slug" element={<ArticlePage />} />
          <Route path="/place/:slug" element={<PlacePage />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/walks" element={<Walks />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/walks/:slug" element={<WalkPage />} />
          <Route path="/hotel/:id" element={<HotelPage />} />
          <Route path="/event/:slug" element={<EventPage />} />
          <Route path="/area" element={<AreaPage />} />
          <Route path="/area/:hood" element={<AreaPage />} />
          <Route path="/area/:hood/:kind" element={<AreaPage />} />
          <Route path="/eat/:craving" element={<AreaPage />} />
          <Route path="/nightlife" element={<Category />} />
          <Route path="/business" element={<Category />} />
          <Route path="/weekend" element={<Weekend />} />
          <Route path="/free" element={<WhatsOn key="free" />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/post/:slug" element={<Post />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/import" element={<ImportCenter />} />
          <Route path="/admin/queue" element={<ReviewQueue />} />
          <Route path="/admin/content" element={<ContentAdmin />} />
          <Route path="/admin/newsletter" element={<NewsletterAdmin />} />
          <Route path="/admin/sources" element={<SourcesAdmin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
