import { RegisterForm } from "@/components/auth/register-form";

// We don't need detailed Metadata here as it's an app page, but good practice
export const metadata = {
    title: "Join AWE e.V.",
    description: "Create your account to start volunteering or donating."
};

export default function RegisterPage() {
    return (
        // The layout.tsx handles the split screen. 
        // This component renders inside the Right Column's "Form Container" div.
        <RegisterForm />
    );
}