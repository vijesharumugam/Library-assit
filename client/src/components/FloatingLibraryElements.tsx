import { BookOpen, Scroll, Feather, GraduationCap } from "lucide-react";
import { memo } from "react";

function FloatingLibraryElements() {
  return (
    <>
      {/* Floating Books */}
      <div className="floating-books floating-book-1">
        <BookOpen className="h-8 w-8 text-primary" />
      </div>
      
      <div className="floating-books floating-book-2">
        <BookOpen className="h-6 w-6 text-accent" />
      </div>
      
      <div className="floating-books floating-book-3">
        <BookOpen className="h-7 w-7 text-chart-3" />
      </div>
      
      {/* Floating Scroll */}
      <div className="floating-books floating-scroll">
        <Scroll className="h-6 w-6 text-chart-4" />
      </div>
      
      {/* Additional decorative elements */}
      <div className="floating-books" style={{ top: '45%', left: '8%', animation: 'gentleFloat 5s ease-in-out infinite', animationDelay: '-3s' }}>
        <Feather className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="floating-books" style={{ top: '20%', left: '85%', animation: 'float 7s ease-in-out infinite', animationDelay: '-1.5s' }}>
        <GraduationCap className="h-6 w-6 text-primary" />
      </div>
    </>
  );
}

export default memo(FloatingLibraryElements);