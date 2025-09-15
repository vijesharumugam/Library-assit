import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, User } from "@shared/schema";
import { AIDueDateSuggestion } from "@/components/ai-due-date-suggestion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const borrowSchema = z.object({
  bookId: z.string().min(1, "Book is required"),
  userId: z.string().min(1, "Student is required"),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
});

type BorrowForm = z.infer<typeof borrowSchema>;

interface BorrowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BorrowModal({ open, onOpenChange }: BorrowModalProps) {
  const { toast } = useToast();
  const [bookSearch, setBookSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const form = useForm<BorrowForm>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      bookId: "",
      userId: "",
    },
  });

  const { data: books = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books/available"],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const borrowMutation = useMutation({
    mutationFn: async (borrowData: BorrowForm) => {
      const res = await apiRequest("POST", "/api/transactions/borrow", borrowData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      toast({
        title: "Book borrowed successfully",
        description: `${selectedBook?.title} has been borrowed by ${selectedStudent?.fullName}`,
      });
      form.reset();
      setSelectedBook(null);
      setSelectedStudent(null);
      setBookSearch("");
      setStudentSearch("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to borrow book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    book.author.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.username.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const onSubmit = (data: BorrowForm) => {
    borrowMutation.mutate(data);
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    form.setValue("bookId", book.id);
    setBookSearch("");
  };

  const handleStudentSelect = (student: User) => {
    setSelectedStudent(student);
    form.setValue("userId", student.id);
    setStudentSearch("");
  };

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 14); // 2 weeks from now

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-borrow-book">
        <DialogHeader>
          <DialogTitle data-testid="title-borrow-modal" className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Borrow Book for Student
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Book Selection */}
          <div className="space-y-2">
            <Label htmlFor="book-search">Select Book</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="book-search"
                  placeholder="Search for books by title or author..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-book-search"
                />
              </div>
              
              {selectedBook ? (
                <div className="p-3 border rounded-lg bg-muted/50" data-testid="selected-book">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedBook.title}</p>
                      <p className="text-sm text-muted-foreground">by {selectedBook.author}</p>
                      <p className="text-xs text-muted-foreground">Available: {selectedBook.availableCopies}</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBook(null);
                        form.setValue("bookId", "");
                      }}
                      data-testid="button-clear-book"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : bookSearch.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book) => (
                      <div
                        key={book.id}
                        className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleBookSelect(book)}
                        data-testid={`book-option-${book.id}`}
                      >
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">by {book.author}</p>
                        <p className="text-xs text-muted-foreground">
                          Available: {book.availableCopies} | Category: {book.category}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-muted-foreground text-center">No books found</p>
                  )}
                </div>
              ) : null}
            </div>
            {form.formState.errors.bookId && (
              <p className="text-sm text-destructive">{form.formState.errors.bookId.message}</p>
            )}
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student-search">Select Student</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  placeholder="Search for students by name, ID, or username..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-student-search"
                />
              </div>
              
              {selectedStudent ? (
                <div className="p-3 border rounded-lg bg-muted/50" data-testid="selected-student">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedStudent.fullName}</p>
                      <p className="text-sm text-muted-foreground">ID: {selectedStudent.studentId}</p>
                      <p className="text-xs text-muted-foreground">Email: {selectedStudent.email}</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        form.setValue("userId", "");
                      }}
                      data-testid="button-clear-student"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : studentSearch.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleStudentSelect(student)}
                        data-testid={`student-option-${student.id}`}
                      >
                        <p className="font-medium">{student.fullName}</p>
                        <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                        <p className="text-xs text-muted-foreground">Email: {student.email}</p>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-muted-foreground text-center">No students found</p>
                  )}
                </div>
              ) : null}
            </div>
            {form.formState.errors.userId && (
              <p className="text-sm text-destructive">{form.formState.errors.userId.message}</p>
            )}
          </div>

          {/* AI Due Date Suggestion */}
          {selectedBook && selectedStudent && (
            <AIDueDateSuggestion
              userId={selectedStudent.id}
              bookId={selectedBook.id}
              userName={selectedStudent.fullName}
              bookTitle={selectedBook.title}
              onSuggestionAccepted={(suggestedDate) => {
                form.setValue("dueDate", suggestedDate);
              }}
              compact={false}
            />
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("dueDate") && "text-muted-foreground"
                  )}
                  data-testid="button-due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("dueDate") ? format(form.watch("dueDate"), "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("dueDate")}
                  onSelect={(date) => {
                    if (date) {
                      form.setValue("dueDate", date);
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  data-testid="calendar-due-date"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.dueDate && (
              <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-borrow"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={borrowMutation.isPending || !selectedBook || !selectedStudent}
              data-testid="button-confirm-borrow"
            >
              {borrowMutation.isPending ? "Processing..." : "Borrow Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}