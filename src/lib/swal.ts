import Swal from "sweetalert2";

export const swalSuccess = (title: string, text?: string) =>
  Swal.fire({
    icon: "success",
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
    customClass: { popup: "rounded-lg" },
  });

export const swalError = (title: string, text?: string) =>
  Swal.fire({
    icon: "error",
    title,
    text,
    customClass: { popup: "rounded-lg" },
  });

export const swalConfirm = (title: string, text?: string) =>
  Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Yes, proceed",
    cancelButtonText: "Cancel",
    confirmButtonColor: "hsl(215, 70%, 45%)",
    cancelButtonColor: "hsl(0, 72%, 51%)",
    customClass: { popup: "rounded-lg" },
  });

export const swalDelete = (itemName = "this item") =>
  Swal.fire({
    icon: "warning",
    title: "Are you sure?",
    text: `You are about to delete ${itemName}. This cannot be undone.`,
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "hsl(0, 72%, 51%)",
    cancelButtonColor: "hsl(215, 70%, 45%)",
    customClass: { popup: "rounded-lg" },
  });
