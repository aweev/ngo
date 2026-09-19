import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
    title: "Reset Password - AWE e.V.",
    description: "Recover access to your account."
};

export default function ForgotPasswordPage() {
    return (
        // Rendered inside the AuthLayout's Right Column
        <ForgotPasswordForm />
    );
}