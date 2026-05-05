import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<Category />} />
          <Route path="/events" element={<Category />} />
          <Route path="/food" element={<Category />} />
          <Route path="/nightlife" element={<Category />} />
          <Route path="/business" element={<Category />} />
          <Route path="/weekend" element={<Category />} />
          <Route path="/free" element={<Category />} />
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
  </QueryClientProvider>
);

export default App;
