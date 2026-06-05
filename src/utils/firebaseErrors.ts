/**
 * Firebase Auth Error Utility
 *
 * Maps Firebase Auth error codes to user-friendly messages.
 */

export function getAuthErrorMessage(error: any): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  // Sometimes Firebase errors don't have a .code property but have the code in the message string
  const errorCode = typeof error.code === "string" 
    ? error.code 
    : (typeof error.message === "string" && error.message.match(/\[(auth\/[^\]]+)\]/)) 
      ? error.message.match(/\[(auth\/[^\]]+)\]/)[1] 
      : null;

  if (!errorCode) {
    return error.message || "An unexpected error occurred. Please try again.";
  }

  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Your password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later or reset your password.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
}
