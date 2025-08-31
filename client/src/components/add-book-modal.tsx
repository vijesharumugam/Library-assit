import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type BookForm = z.infer<typeof insertBookSchema>;

interface AddBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBookModal({ open, onOpenChange }: AddBookModalProps) {
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

  const addBookMutation = useMutation({
    mutationFn: async (bookData: BookForm) => {
      const res = await apiRequest("POST", "/api/books", bookData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      toast({
        title: "Book added successfully",
        description: "The book has been added to the library collection",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookForm) => {
    addBookMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-book">
        <DialogHeader>
          <DialogTitle data-testid="title-add-book-modal">Add New Book</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                data-testid="input-book-title"
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
                data-testid="input-book-author"
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
                data-testid="input-book-isbn"
                {...form.register("isbn")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={form.watch("category")} 
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger data-testid="select-book-category">
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
                data-testid="input-book-copies"
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
                data-testid="input-book-publisher"
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
              data-testid="textarea-book-description"
              {...form.register("description")}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add-book"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addBookMutation.isPending}
              data-testid="button-submit-add-book"
            >
              {addBookMutation.isPending ? "Adding..." : "Add Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
