import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookSchema, Book } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type BookForm = z.infer<typeof insertBookSchema>;

interface EditBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;
}

export function EditBookModal({ open, onOpenChange, book }: EditBookModalProps) {
  const { toast } = useToast();

  const form = useForm<BookForm>({
    resolver: zodResolver(insertBookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      category: "",
      description: "",
      publisher: "",
      totalCopies: 1,
    },
  });

  // Reset form when book changes or modal opens
  useEffect(() => {
    if (book && open) {
      form.reset({
        title: book.title,
        author: book.author,
        isbn: book.isbn || "",
        category: book.category,
        description: book.description || "",
        publisher: book.publisher || "",
        totalCopies: book.totalCopies,
      });
    }
  }, [book, open, form]);

  const updateBookMutation = useMutation({
    mutationFn: async (bookData: BookForm) => {
      if (!book?.id) throw new Error("No book ID provided");
      const res = await apiRequest("PUT", `/api/books/${book.id}`, bookData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      toast({
        title: "Book updated successfully",
        description: "The book details have been updated",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookForm) => {
    updateBookMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-edit-book">
        <DialogHeader>
          <DialogTitle data-testid="title-edit-book-modal">Edit Book</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                data-testid="input-edit-book-title"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                placeholder="Enter author name"
                data-testid="input-edit-book-author"
                {...form.register("author")}
              />
              {form.formState.errors.author && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.author.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                placeholder="Enter ISBN"
                data-testid="input-edit-book-isbn"
                {...form.register("isbn")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={form.watch("category")} 
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger data-testid="select-edit-book-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="biography">Biography</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="literature">Literature</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="self-help">Self Help</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCopies">Number of Copies *</Label>
              <Input
                id="totalCopies"
                type="number"
                min="1"
                placeholder="Enter number of copies"
                data-testid="input-edit-book-copies"
                {...form.register("totalCopies", { valueAsNumber: true })}
              />
              {form.formState.errors.totalCopies && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.totalCopies.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                placeholder="Enter publisher"
                data-testid="input-edit-book-publisher"
                {...form.register("publisher")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Enter book description"
              data-testid="textarea-edit-book-description"
              {...form.register("description")}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit-book"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateBookMutation.isPending}
              data-testid="button-submit-edit-book"
            >
              {updateBookMutation.isPending ? "Updating..." : "Update Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}